import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA3Eod8sAtVbUM3vhr4tYKskp3ZXm5ozaQ",
  authDomain: "cosmic-facility-438122-p7.firebaseapp.com",
  projectId: "cosmic-facility-438122-p7",
  storageBucket: "cosmic-facility-438122-p7.firebasestorage.app",
  messagingSenderId: "865230080196",
  appId: "1:865230080196:web:c6c154af273529b4cbe191"
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);


