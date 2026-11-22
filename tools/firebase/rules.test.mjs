import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let env;
const projectId = "demo-budget-checks";
const budget = (db, id = "household") => doc(db, "budgets", id);
const entry = db => doc(db, "budgets", "household", "entries", "rent");
const as = uid => env.authenticatedContext(uid).firestore();

before(async () => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8080", "Run these checks with npm test and the local emulator");
  env = await initializeTestEnvironment({ projectId });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(budget(db), { kind: "shared", owner: "owner", members: ["owner", "member", "guest"] });
    await setDoc(budget(db, "personal"), { kind: "personal", owner: "owner", members: ["owner"] });
    await setDoc(entry(db), { name: "Rent", amount: 100 });
  });
});

after(async () => {
  await env?.cleanup();
});

test("signed-out users and non-members cannot access a shared budget", async () => {
  const signedOut = env.unauthenticatedContext().firestore();
  const outsider = as("outsider");
  await assertFails(getDoc(budget(signedOut)));
  await assertFails(getDoc(entry(signedOut)));
  await assertFails(getDoc(budget(outsider)));
  await assertFails(getDoc(entry(outsider)));
  await assertFails(updateDoc(entry(outsider), { amount: 200 }));
});

test("members can edit entries but cannot manage membership or delete the budget", async () => {
  const member = as("member");
  await assertSucceeds(getDoc(budget(member)));
  await assertSucceeds(updateDoc(entry(member), { amount: 120 }));
  await assertFails(updateDoc(budget(member), { members: ["owner", "member", "guest", "outsider"] }));
  await assertFails(deleteDoc(budget(member)));
});

test("the owner can share a household budget, while a personal budget stays private", async () => {
  const owner = as("owner");
  const outsider = as("outsider");
  await assertSucceeds(updateDoc(budget(owner), { members: ["owner", "member", "guest", "outsider"] }));
  await assertSucceeds(getDoc(entry(outsider)));
  await assertFails(updateDoc(budget(owner, "personal"), { members: ["owner", "member"] }));
  await assertFails(getDoc(budget(as("member"), "personal")));
});

test("a member can remove themselves and then loses access", async () => {
  const guest = as("guest");
  const { members } = (await assertSucceeds(getDoc(budget(guest)))).data();
  await assertSucceeds(updateDoc(budget(guest), { members: members.filter(uid => uid !== "guest") }));
  await assertFails(getDoc(entry(guest)));
});
