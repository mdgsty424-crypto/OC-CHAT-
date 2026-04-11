import { doc, setDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

async function createAIUser() {
  const aiUser = {
    displayName: 'OCSTHAEL AI',
    photoURL: 'https://cdn-icons-png.flaticon.com/512/4712/4712038.png', // Placeholder AI Bot icon
    verified: true,
    online: true,
    role: 'bot'
  };

  try {
    await setDoc(doc(db, 'users', 'ocsthael-ai-bot'), aiUser);
    console.log('AI User created successfully');
  } catch (error) {
    console.error('Error creating AI user:', error);
  }
}

createAIUser();
