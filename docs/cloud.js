// Cloud sync through Firebase (Auth email/password, sign-up disabled + Firestore with offline cache).
// Data layout (the Firestore rules in firestore.rules enforce who may touch what):
//   users/{uid}                         this person's look settings (only they can read it)
//   budgets/{bid}                       { name, kind: "personal"|"shared", owner, members:[uid], memberNames, currency, categories }
//   budgets/{bid}/entries/{id}          income, bills and spending (one-off or repeating)
//   budgets/{bid}/months/{YYYY-MM}      { paid:{id:bool}, amounts:{id:number}, skip:{id:true}, note }
//   budgets/{bid}/goals/{id}            savings goals
//   budgets/{bid}/activity/{id}         who changed what and when (add-only)
// Only the members listed on a budget can read or write it; a personal budget can never get extra members.
const V = "10.12.2";
const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
const cfg = window.BUDGET_FIREBASE;

async function connectStore(app, auth) {
  const F = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  let fs;
  try { fs = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
  catch { fs = F.getFirestore(app); }

  const uid = () => auth.currentUser?.uid;
  const bdoc = bid => F.doc(fs, "budgets", bid);
  const sub = (bid, name) => F.collection(fs, "budgets", bid, name);
  const listOf = s => s.docs.map(d => ({ ...d.data(), id: d.id }));
  // {a:{b:null}} -> {a:{b:deleteField()}} so a null in a patch removes that key
  const nulls = o => Object.fromEntries(Object.entries(o).map(([k, v]) =>
    [k, v === null ? F.deleteField() : (v && typeof v === "object" && !Array.isArray(v)) ? nulls(v) : v]));

  Object.assign(window.Cloud, {
    version: "20261122v",   // must match APP_VERSION in index.html

    watchProfile: (cb, err) => F.onSnapshot(F.doc(fs, "users", uid()), s => cb(s.exists() ? s.data() : {}), err),
    saveProfile: patch => F.setDoc(F.doc(fs, "users", uid()), nulls(patch), { merge: true }),

    watchBudgets: (cb, err) => F.onSnapshot(
      F.query(F.collection(fs, "budgets"), F.where("members", "array-contains", uid())),
      { includeMetadataChanges: true }, s => cb(listOf(s), s.metadata), err),
    // writes return at once (offline-friendly); `done` settles when the server has it
    createBudget(data) {
      const r = F.doc(F.collection(fs, "budgets"));
      return { id: r.id, done: F.setDoc(r, { ...data, owner: uid(), members: [uid()], createdAt: Date.now() }) };
    },
    updateBudget: (bid, patch) => F.setDoc(bdoc(bid), nulls(patch), { merge: true }),
    replaceBudgetField: (bid, field, value) => F.updateDoc(bdoc(bid), { [field]: value }),
    async deleteBudget(bid) {
      for (const name of ["entries", "months", "goals", "activity"]) {
        const s = await F.getDocs(sub(bid, name));
        for (let i = 0; i < s.docs.length; i += 400) {
          const b = F.writeBatch(fs);
          s.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
          await b.commit();
        }
      }
      await F.deleteDoc(bdoc(bid));
    },
    leaveBudget: bid => F.updateDoc(bdoc(bid), {
      members: F.arrayRemove(uid()), [`memberNames.${uid()}`]: F.deleteField() }),

    watchBudget(bid, on, err) {
      const u = [
        F.onSnapshot(sub(bid, "entries"), s => on.entries(listOf(s)), err),
        F.onSnapshot(sub(bid, "months"), s => on.months(Object.fromEntries(s.docs.map(d => [d.id, d.data()]))), err),
        F.onSnapshot(sub(bid, "goals"), s => on.goals(listOf(s)), err),
      ];
      return () => u.forEach(f => f());
    },
    saveItem(bid, col, id, data) {
      const r = id ? F.doc(sub(bid, col), id) : F.doc(sub(bid, col));
      return { id: r.id, done: F.setDoc(r, data) };
    },
    deleteItem: (bid, col, id) => F.deleteDoc(F.doc(sub(bid, col), id)),
    // activity history: append-only (the rules refuse edits), newest first
    addActivity: (bid, d) => F.addDoc(sub(bid, "activity"), d),
    watchActivity: (bid, cb, err) => F.onSnapshot(F.query(sub(bid, "activity"), F.orderBy("at", "desc"), F.limit(80)), s => cb(listOf(s)), err),
    setMonth: (bid, month, patch) => F.setDoc(F.doc(sub(bid, "months"), month), nulls(patch), { merge: true }),
  });
}

function cloudFailed(error) {
  console.error("Budget sync failed to load", error);
  emit("cloud-failed", null);
}

if (cfg) {
  try {
    const [{ initializeApp }, A] = await Promise.all(
      ["app", "auth"].map(name => import(`https://www.gstatic.com/firebasejs/${V}/firebase-${name}.js`)),
    );
    const app = initializeApp(cfg);
    const auth = A.getAuth(app);
    window.Cloud = {
      signIn: (email, pw) => A.signInWithEmailAndPassword(auth, email, pw),
      signOut: () => A.signOut(auth),
      resetPassword: email => A.sendPasswordResetEmail(auth, email),
    };

    // The sign-in screen can open while Firestore prepares the budget store.
    const storeReady = connectStore(app, auth);
    storeReady.catch(() => {}); // report this to the user if a signed-in session needs the store
    let authRevision = 0;
    A.onAuthStateChanged(auth, user => {
      const revision = ++authRevision;
      if (!user) {
        emit("cloud-auth", null);
        return;
      }
      storeReady.then(() => {
        if (revision === authRevision) emit("cloud-auth", { uid: user.uid, email: user.email || "" });
      }, error => {
        if (revision === authRevision) cloudFailed(error);
      });
    }, cloudFailed);
  } catch (error) {
    cloudFailed(error);
  }
}
