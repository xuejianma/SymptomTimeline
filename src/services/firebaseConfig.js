import { initializeApp } from "firebase/app";
import { getDatabase, ref, child, get, set } from "firebase/database";
import "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDT6QViLszoCiQIploU5L38QM5rTNWCh7c",
  authDomain: "symptom-timeline.firebaseapp.com",
  databaseURL: "https://symptom-timeline-default-rtdb.firebaseio.com",
  projectId: "symptom-timeline",
  storageBucket: "symptom-timeline.appspot.com",
  messagingSenderId: "325790756362",
  appId: "1:325790756362:web:c0a0fe1b5b92f889db79f3",
  measurementId: "G-M4VM9ESYEX"
};

const firebaseApp = initializeApp(firebaseConfig);
const dbRef = ref(getDatabase());
const getData = async (id) => {
  if (!id) {
    console.log('no id')
    return
  }
  const snapshot = await get(child(dbRef, `timelines/${id}`));
  if (snapshot.exists()) {
    return snapshot.val()
  } else {
    console.log("No data available");
  }
}

const saveData = async (id, data) => {
  if (!id) {
    console.log('no id')
    return
  }
  await set(child(dbRef, `timelines/${id}`), data)
}

export default {
  firebaseApp,
  dbRef,
  getData,
  saveData,
}