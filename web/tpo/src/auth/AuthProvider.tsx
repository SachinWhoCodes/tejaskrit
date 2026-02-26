import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export type AppRole = "tpo" | "student" | "admin" | "pending_tpo";

export type UserProfile = {
  uid: string;
  email?: string | null;
  displayEmail?: string | null; // used for demo/anonymous logins
  name?: string | null;
  photoUrl?: string | null;
  role: AppRole;
  instituteId?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

type RegisterCollegeInput = {
  instituteName: string;
  instituteCode?: string;
  allowedDomains: string[]; // ["mitsgwalior.in"]
};

type RegisterAccountInput = {
  name: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;

  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  registerWithEmailPassword: (input: RegisterAccountInput) => Promise<void>;

  // optional demo mode (anonymous). If you don’t want it, you can remove from UI.
  loginDemoCollege: () => Promise<void>;

  logout: () => Promise<void>;

  registerCollege: (input: RegisterCollegeInput) => Promise<string>; // returns instituteId
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureUserDoc(u: User): Promise<UserProfile> {
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const profile: UserProfile = {
      uid: u.uid,
      email: u.email,
      name: u.displayName,
      photoUrl: u.photoURL,
      role: "pending_tpo",
      instituteId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, profile, { merge: true });
    return profile;
  }

  const data = snap.data() as UserProfile;
  return {
    uid: u.uid,
    email: u.email ?? data.email,
    name: u.displayName ?? data.name,
    photoUrl: u.photoURL ?? data.photoUrl,
    role: data.role ?? "pending_tpo",
    instituteId: data.instituteId ?? null,
    displayEmail: data.displayEmail ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const p = await ensureUserDoc(u);
      setProfile(p);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loginWithEmailPassword = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const registerWithEmailPassword = async (input: RegisterAccountInput) => {
    const email = input.email.trim();
    const password = input.password;
    const name = input.name.trim();

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Set display name for UI
    if (name) {
      await updateProfile(cred.user, { displayName: name });
    }

    // Ensure user doc exists immediately
    const p = await ensureUserDoc(cred.user);
    setProfile(p);
  };

  // Optional demo: requires enabling Anonymous provider in Firebase Auth.
  const loginDemoCollege = async () => {
    const cred = await signInAnonymously(auth);
    const u = cred.user;

    const demoInstituteId = "demo-institute";
    const instituteRef = doc(db, "institutes", demoInstituteId);

    await setDoc(
      instituteRef,
      {
        name: "Demo Institute",
        code: "DEMO",
        allowedDomains: ["demo.edu"],
        createdAt: serverTimestamp(),
        createdBy: u.uid,
        isActive: true,
      },
      { merge: true },
    );

    await setDoc(
      doc(db, "institutes", demoInstituteId, "members", u.uid),
      {
        uid: u.uid,
        role: "tpo",
        status: "active",
        joinedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await setDoc(
      doc(db, "users", u.uid),
      {
        uid: u.uid,
        role: "tpo",
        instituteId: demoInstituteId,
        displayEmail: "tpo@demo.edu",
        name: "Demo TPO",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    setProfile({
      uid: u.uid,
      role: "tpo",
      instituteId: demoInstituteId,
      displayEmail: "tpo@demo.edu",
      name: "Demo TPO",
    });
  };

  const logout = async () => {
    await signOut(auth);
  };

  const registerCollege = async (input: RegisterCollegeInput) => {
    if (!user) throw new Error("Not logged in");

    const instituteDoc = doc(collection(db, "institutes"));
    const instituteId = instituteDoc.id;

    await setDoc(instituteDoc, {
      name: input.instituteName.trim(),
      code: (input.instituteCode ?? "").trim() || null,
      allowedDomains: input.allowedDomains
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean),
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      isActive: true,
    });

    await setDoc(doc(db, "institutes", instituteId, "members", user.uid), {
      uid: user.uid,
      role: "tpo",
      status: "active",
      joinedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "users", user.uid), {
      role: "tpo",
      instituteId,
      updatedAt: serverTimestamp(),
      email: user.email ?? null,
      name: user.displayName ?? null,
      photoUrl: user.photoURL ?? null,
    });

    setProfile((prev) =>
      prev
        ? { ...prev, role: "tpo", instituteId }
        : { uid: user.uid, role: "tpo", instituteId },
    );

    return instituteId;
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      loginWithEmailPassword,
      registerWithEmailPassword,
      loginDemoCollege,
      logout,
      registerCollege,
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider />");
  return ctx;
}
