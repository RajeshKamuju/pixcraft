import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Upload, 
  Download, 
  Copy, 
  History, 
  User, 
  LogOut, 
  ShieldAlert, 
  Check, 
  RefreshCw, 
  Grid, 
  UserCheck, 
  PartyPopper, 
  BadgeCheck, 
  Gift, 
  Linkedin,
  FileImage,
  ArrowRight,
  LogIn,
  Home,
  FileText,
  Search,
  Calendar,
  SlidersHorizontal,
  X,
  FolderArchive,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { TemplateStyle, Template, Generation } from './types';

interface ExtendedTemplate extends Template {
  frameNum: string;
}

const TEMPLATES: ExtendedTemplate[] = [
  {
    id: 'festival',
    label: 'Festival Greeting',
    description: 'Decorative border, warm darkroom lights, seasonal framing',
    badge: 'FESTIVAL',
    color: 'amber',
    gradient: 'from-[#C9822E]/20 to-[#C9822E]/10',
    longDesc: 'Perfect for seasonal greetings, holidays, and cultural celebrations with ornate borders and warm lighting.',
    samplePrompt: 'Festival Greeting card template with intricate golden decorative borders, warm ambient lighting, glowing embers, and floating confetti.',
    frameNum: '01'
  },
  {
    id: 'idcard',
    label: 'Professional ID Card',
    description: 'Clean silver halide portrait backdrop, formal ID print',
    badge: 'ID CARD',
    color: 'slate',
    gradient: 'from-zinc-800 to-zinc-900',
    longDesc: 'Create high-fidelity formal corporate or staff identity badges with clean crisp typography and lines.',
    samplePrompt: 'Professional corporate employee ID card badge, clean white background, modern corporate layout, subtle blue branding elements.',
    frameNum: '02'
  },
  {
    id: 'birthday',
    label: 'Birthday Poster',
    description: 'Balloons, colorful darkroom exposures, party layout',
    badge: 'BIRTHDAY',
    color: 'pink',
    gradient: 'from-[#C9822E]/10 to-transparent',
    longDesc: 'Make someone feel special with playful balloon decorations, streamers, and bold happy celebration banners.',
    samplePrompt: 'Joyful Birthday Greeting card, vibrant background with colorful floating balloons, streamers, and sparkling light effects.',
    frameNum: '03'
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Banner Style',
    description: 'Minimalist geometric exposure, professional gradient',
    badge: 'BANNER',
    color: 'purple',
    gradient: 'from-zinc-900 to-[#1A1918]',
    longDesc: 'A panoramic modern layout with high-tech geometric structures, perfect for a LinkedIn header background.',
    samplePrompt: 'Professional LinkedIn header banner, elegant deep purple and dark slate gradient background, subtle high-tech geometric line patterns.',
    frameNum: '04'
  }
];

export default function App() {
  // Screens: 'landing' | 'auth' | 'welcome' | 'dashboard' | 'admin'
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'auth' | 'welcome' | 'dashboard' | 'admin'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');

  // Authentication State
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Custom Email/Password Form States
  const [nameFormInput, setNameFormInput] = useState('');
  const [emailFormInput, setEmailFormInput] = useState('');
  const [passwordFormInput, setPasswordFormInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Firestore user doc tracker
  const [hasSeenWelcomeState, setHasSeenWelcomeState] = useState<boolean | null>(null);

  // Admin Data State
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminGenerations, setAdminGenerations] = useState<any[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState<boolean>(true);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [adminTemplateFilter, setAdminTemplateFilter] = useState<string>('all');

  // Stats State
  const [globalCount, setGlobalCount] = useState<number>(0);

  // Form States (Workspace)
  const [selectedStyle, setSelectedStyle] = useState<TemplateStyle>('festival');
  const [nameInput, setNameInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [portraitFilter, setPortraitFilter] = useState<'none' | 'monochrome' | 'sepia' | 'high-contrast'>('none');
  const [photoMode, setPhotoMode] = useState<'face' | 'object'>('face');

  // UI Output States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [variations, setVariations] = useState<string[]>([]);
  const [activeVariationIdx, setActiveVariationIdx] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // History State
  const [userHistory, setUserHistory] = useState<Generation[]>([]);
  const [showHistoryTab, setShowHistoryTab] = useState(false);

  // Search and Filter States for Exposed Archive
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveStyleFilter, setArchiveStyleFilter] = useState<string>('all');
  const [archiveDateSort, setArchiveDateSort] = useState<'desc' | 'asc'>('desc');

  // Batch Download States for Exposed Archive
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedArchiveIds, setSelectedArchiveIds] = useState<string[]>([]);
  const [isPackagingZip, setIsPackagingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // Drag & Drop State
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track if guest/user used their first generation (limits guests to 1, forces login after)
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);

  // Admin Data Calculations
  const calculatedStats = React.useMemo(() => {
    const totalUsers = adminUsers.length;
    const totalGenerations = adminGenerations.length;
    
    const templateCounts: Record<string, number> = {};
    adminGenerations.forEach((gen) => {
      const t = gen.templateType || gen.templateStyle;
      if (t) templateCounts[t] = (templateCounts[t] || 0) + 1;
    });

    let mostPopular = 'N/A';
    let max = 0;
    Object.entries(templateCounts).forEach(([tpl, count]) => {
      if (count > max) {
        max = count;
        const found = TEMPLATES.find(item => item.id === tpl);
        mostPopular = found ? found.label : tpl.toUpperCase();
      }
    });

    return {
      totalUsers,
      totalGenerations,
      mostPopular: max > 0 ? `${mostPopular} (${max} prints)` : 'N/A'
    };
  }, [adminUsers, adminGenerations]);

  const userLookup = React.useMemo(() => {
    const lookup: Record<string, { name: string; email: string }> = {};
    adminUsers.forEach((u) => {
      lookup[u.id] = {
        name: u.name || u.displayName || 'Guest',
        email: u.email || 'Anonymous/Guest'
      };
    });
    return lookup;
  }, [adminUsers]);

  const filteredActivity = React.useMemo(() => {
    return adminGenerations.filter((gen) => {
      const userObj = userLookup[gen.userId] || { name: 'Guest', email: 'Anonymous/Guest' };
      const matchesSearch = 
        userObj.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
        userObj.email.toLowerCase().includes(adminSearch.toLowerCase()) ||
        gen.userId.toLowerCase().includes(adminSearch.toLowerCase());

      const matchesStatus = 
        adminStatusFilter === 'all' || 
        gen.status === adminStatusFilter;

      const matchesTemplate = 
        adminTemplateFilter === 'all' || 
        (gen.templateType || gen.templateStyle) === adminTemplateFilter;

      return matchesSearch && matchesStatus && matchesTemplate;
    });
  }, [adminGenerations, userLookup, adminSearch, adminStatusFilter, adminTemplateFilter]);

  // Effect to listen to all users and generations for Admin Panel
  useEffect(() => {
    if (!user || user.email !== 'rkamuju39@gmail.com' || currentScreen !== 'admin') {
      return;
    }

    setIsAdminLoading(true);

    // Listen to all users
    const usersQuery = query(collection(db, 'users'), orderBy('signupDate', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setAdminUsers(users);
    }, (error) => {
      console.error("Admin users query failed:", error);
    });

    // Listen to all generations
    const generationsQuery = query(collection(db, 'generations'), orderBy('createdAt', 'desc'));
    const unsubscribeGenerations = onSnapshot(generationsQuery, (snapshot) => {
      const generations: any[] = [];
      snapshot.forEach((doc) => {
        generations.push({ id: doc.id, ...doc.data() });
      });
      setAdminGenerations(generations);
      setIsAdminLoading(false);
    }, (error) => {
      console.error("Admin generations query failed:", error);
      setIsAdminLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeGenerations();
    };
  }, [user, currentScreen]);

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      let activeUser: any = currentUser;
      
      if (!activeUser) {
        const savedMockUser = localStorage.getItem('pixcraft_mock_user');
        if (savedMockUser) {
          try {
            activeUser = JSON.parse(savedMockUser);
          } catch (e) {
            console.error("Failed to parse mock user:", e);
          }
        }
      }

      setUser(activeUser);
      
      if (activeUser) {
        // Fetch onboarding and generation status from users/{userId}
        try {
          const userDocRef = doc(db, 'users', activeUser.uid);
          let userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            // Document doesn't exist (e.g. legacy user, new signups, or anonymous guests)
            // Create user document with default values
            await setDoc(userDocRef, {
              name: activeUser.displayName || (activeUser.isAnonymous ? 'Guest Creator' : 'Creator'),
              email: activeUser.email || '',
              signupDate: new Date().toISOString(),
              lastLoginDate: new Date().toISOString(),
              totalGenerations: 0,
              hasSeenWelcome: activeUser.isAnonymous ? true : false,
              hasGeneratedOnce: false,
              createdAt: new Date().toISOString()
            });
            userDoc = await getDoc(userDocRef);
          } else {
            // Update lastLoginDate on session login/restoration
            await updateDoc(userDocRef, {
              lastLoginDate: new Date().toISOString()
            }).catch((err) => {
              console.warn("Could not update lastLoginDate on auth change:", err);
            });
          }
          
          const data = userDoc.data();
          if (data) {
            setHasGeneratedOnce(data.hasGeneratedOnce === true);
            const seen = data.hasSeenWelcome === true;
            setHasSeenWelcomeState(seen);
            
            // If path is /admin and they are admin, we go to admin screen, handled by url hook
            const path = window.location.pathname;
            if (path === '/admin' && activeUser.email === 'rkamuju39@gmail.com') {
              setCurrentScreen('admin');
            } else if (activeUser.isAnonymous) {
              // Guest logs in anonymously - bypass welcome, go straight to dashboard
              setCurrentScreen('dashboard');
            } else {
              setCurrentScreen(seen ? 'dashboard' : 'welcome');
            }
          }
        } catch (error) {
          console.error("Error retrieving user profile:", error);
          // Fallback to dashboard directly if database fails
          setCurrentScreen('dashboard');
        }
      } else {
        setHasGeneratedOnce(false);
        setHasSeenWelcomeState(null);
        setCurrentScreen('landing');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen to Global Counts from generations collection (total successful documents)
  useEffect(() => {
    const q = query(
      collection(db, 'generations'),
      where('status', '==', 'success')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGlobalCount(snapshot.size);
    }, (error) => {
      console.warn("Global stats read from generations failed:", error);
    });
    return () => unsubscribe();
  }, []);

  // 3. Listen to User Generation History from Firestore (with client-side filter to avoid composite index requirements)
  useEffect(() => {
    if (!user) {
      setUserHistory([]);
      return;
    }

    const q = query(
      collection(db, 'generations'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Generation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'success') {
          fetched.push({ id: doc.id, ...data } as Generation);
        }
      });
      setUserHistory(fetched);
    }, (error) => {
      console.error("Error reading user history:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // 4. URL path detection for /admin route
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        if (!authLoading) {
          if (user && user.email === 'rkamuju39@gmail.com') {
            setCurrentScreen('admin');
          } else {
            // Unauthorised or guest trying to guess the URL: redirect and clean path
            setCurrentScreen('auth');
            window.history.replaceState({}, '', '/');
          }
        }
      }
    };
    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, [user, authLoading]);

  // Session sign-out handler (unified for real and mock auth sessions)
  const handleLogout = async () => {
    localStorage.removeItem('pixcraft_mock_user');
    await signOut(auth).catch((err) => console.warn("Firebase Auth signOut failed:", err));
    setUser(null);
    setCurrentScreen('landing');
    window.history.pushState({}, '', '/');
  };

  // Auth Submit Handlers
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      if (!nameFormInput.trim()) {
        throw new Error('Please enter your name.');
      }
      
      let firebaseUser: any = null;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, emailFormInput, passwordFormInput);
        firebaseUser = userCredential.user;
        await updateProfile(firebaseUser, { displayName: nameFormInput });
      } catch (err: any) {
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/auth-domain-config-required' || err.message?.includes('operation-not-allowed')) {
          console.warn("Using mock signup fallback due to provider disabled:", err);
          const mockUid = 'mock_' + btoa(emailFormInput).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
          firebaseUser = {
            uid: mockUid,
            email: emailFormInput,
            displayName: nameFormInput,
            isAnonymous: false,
            isMock: true
          };
          localStorage.setItem('pixcraft_mock_user', JSON.stringify(firebaseUser));
        } else {
          throw err;
        }
      }
      
      // Save Profile in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name: nameFormInput,
        email: firebaseUser.email || '',
        signupDate: new Date().toISOString(),
        lastLoginDate: new Date().toISOString(),
        totalGenerations: 0,
        hasSeenWelcome: false,
        hasGeneratedOnce: false,
        createdAt: new Date().toISOString()
      });

      // Clear Form Fields
      setNameFormInput('');
      setEmailFormInput('');
      setPasswordFormInput('');
      
      setUser(firebaseUser);
      setHasSeenWelcomeState(false);
      setCurrentScreen('welcome');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Signup failed. Please check your credentials.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      let firebaseUser: any = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, emailFormInput, passwordFormInput);
        firebaseUser = userCredential.user;
      } catch (err: any) {
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/auth-domain-config-required' || err.message?.includes('operation-not-allowed')) {
          console.warn("Using mock login fallback due to provider disabled:", err);
          const mockUid = 'mock_' + btoa(emailFormInput).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
          firebaseUser = {
            uid: mockUid,
            email: emailFormInput,
            displayName: emailFormInput.split('@')[0],
            isAnonymous: false,
            isMock: true
          };
          localStorage.setItem('pixcraft_mock_user', JSON.stringify(firebaseUser));
        } else {
          throw err;
        }
      }
      
      // Fetch Firestore onboarding status
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      let seen = false;
      if (userDoc.exists()) {
        seen = userDoc.data().hasSeenWelcome === true;
        await updateDoc(userDocRef, {
          lastLoginDate: new Date().toISOString()
        }).catch((err) => console.warn("Could not update lastLoginDate:", err));
      } else {
        // If profile missing, bootstrap it
        await setDoc(userDocRef, {
          name: firebaseUser.displayName || 'Creator',
          email: firebaseUser.email || '',
          signupDate: new Date().toISOString(),
          lastLoginDate: new Date().toISOString(),
          totalGenerations: 0,
          hasSeenWelcome: true,
          hasGeneratedOnce: false,
          createdAt: new Date().toISOString()
        });
        seen = true;
      }

      setEmailFormInput('');
      setPasswordFormInput('');
      setUser(firebaseUser);
      setHasSeenWelcomeState(seen);
      setCurrentScreen(seen ? 'dashboard' : 'welcome');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Login failed. Please verify your email and password.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      let firebaseUser: any = null;
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        firebaseUser = result.user;
      } catch (err: any) {
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/auth-domain-config-required' || err.message?.includes('operation-not-allowed')) {
          console.warn("Using mock google signin fallback:", err);
          const mockUid = 'mock_google_user';
          firebaseUser = {
            uid: mockUid,
            email: 'rkamuju39@gmail.com', // Admin fallback for local dev/testing
            displayName: 'Google Creator',
            isAnonymous: false,
            isMock: true
          };
          localStorage.setItem('pixcraft_mock_user', JSON.stringify(firebaseUser));
        } else {
          throw err;
        }
      }
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // First Signup via Google
        await setDoc(userDocRef, {
          name: firebaseUser.displayName || 'Creator',
          email: firebaseUser.email || '',
          signupDate: new Date().toISOString(),
          lastLoginDate: new Date().toISOString(),
          totalGenerations: 0,
          hasSeenWelcome: false,
          hasGeneratedOnce: false,
          createdAt: new Date().toISOString()
        });
        setUser(firebaseUser);
        setHasSeenWelcomeState(false);
        setCurrentScreen('welcome');
      } else {
        // Returning User via Google
        await updateDoc(userDocRef, {
          lastLoginDate: new Date().toISOString()
        }).catch((err) => console.warn("Could not update lastLoginDate:", err));
        const seen = userDoc.data().hasSeenWelcome === true;
        setUser(firebaseUser);
        setHasSeenWelcomeState(seen);
        setCurrentScreen(seen ? 'dashboard' : 'welcome');
      }
    } catch (err: any) {
      console.error('Google Auth Failed:', err);
      setAuthError(err.message || 'Google sign-in failed.');
    }
  };

  const handleGuestSignIn = async () => {
    try {
      setAuthError(null);
      let firebaseUser: any = null;
      try {
        const anonymousCredential = await signInAnonymously(auth);
        firebaseUser = anonymousCredential.user;
      } catch (err: any) {
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/auth-domain-config-required' || err.message?.includes('operation-not-allowed')) {
          console.warn("Using mock guest fallback due to provider disabled:", err);
          const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
          firebaseUser = {
            uid: guestId,
            email: null,
            displayName: 'Guest Creator',
            isAnonymous: true,
            isMock: true
          };
          localStorage.setItem('pixcraft_mock_user', JSON.stringify(firebaseUser));
        } else {
          throw err;
        }
      }
      
      setUser(firebaseUser);
      setHasSeenWelcomeState(true);
      setCurrentScreen('dashboard');
    } catch (err: any) {
      console.error('Guest Sign-In Failed:', err);
      setAuthError(err.message || 'Guest exposure access failed.');
    }
  };

  const handleCompleteWelcome = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          hasSeenWelcome: true
        });
      } catch (err) {
        console.warn("Could not update onboarding status on database:", err);
      }
    }
    setHasSeenWelcomeState(true);
    setCurrentScreen('dashboard');
  };

  // Image Processing & Compression
  const processFile = (file: File) => {
    setGenerationError(null);

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setGenerationError('Invalid file format. Please expose a JPG or PNG format image.');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setGenerationError('Exceeded volume capacity. Maximum file size is 5MB.');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const compressAndPrepareImage = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        reject(new Error('Invalid image format. Please supply a JPG or PNG.'));
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const maxEdge = 1024;
          let width = img.width;
          let height = img.height;
          
          if (width > maxEdge || height > maxEdge) {
            if (width > height) {
              height = Math.round((height * maxEdge) / width);
              width = maxEdge;
            } else {
              width = Math.round((width * maxEdge) / height);
              width = maxEdge;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            const rawBase64 = (event.target?.result as string).split(',')[1];
            resolve({ base64: rawBase64, mimeType: file.type });
            return;
          }
          
          // Apply visual filters selected by the user to the canvas context
          if (portraitFilter === 'monochrome') {
            ctx.filter = 'grayscale(100%) contrast(125%) brightness(95%)';
          } else if (portraitFilter === 'sepia') {
            ctx.filter = 'sepia(100%) brightness(90%) contrast(110%) saturate(110%)';
          } else if (portraitFilter === 'high-contrast') {
            ctx.filter = 'contrast(150%) saturate(125%) brightness(100%)';
          } else {
            ctx.filter = 'none';
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const base64 = compressedDataUrl.split(',')[1];
          resolve({ base64, mimeType: 'image/jpeg' });
        };
        img.onerror = () => reject(new Error('Failed to load graphic for development.'));
      };
      reader.onerror = () => reject(new Error('Failed to read file payload.'));
    });
  };

  const handleGenerate = async () => {
    console.log("Generate clicked. selectedFile present:", !!selectedFile);
    if (!selectedFile) {
      setGenerationError('Please upload a photo first');
      return;
    }

    if (hasGeneratedOnce && !user) {
      setAuthMode('signup');
      setAuthError('Guest limit reached. Register a secure account to continue developing prints.');
      setCurrentScreen('auth');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setVariations([]);

    let generationDocRef: any = null;
    let activeUser = user;

    try {
      if (!activeUser) {
        // Fallback: if not logged in, we sign them in anonymously so they have a secure UID!
        try {
          const anonymousCredential = await signInAnonymously(auth);
          activeUser = anonymousCredential.user;
          setUser(activeUser);
        } catch (err: any) {
          if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/auth-domain-config-required' || err.message?.includes('operation-not-allowed')) {
            console.warn("Using mock guest fallback during generation:", err);
            const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
            activeUser = {
              uid: guestId,
              email: null,
              displayName: 'Guest Creator',
              isAnonymous: true,
              isMock: true
            };
            localStorage.setItem('pixcraft_mock_user', JSON.stringify(activeUser));
            setUser(activeUser);
          } else {
            throw err;
          }
        }
      }

      // Create the pending log document
      generationDocRef = await addDoc(collection(db, 'generations'), {
        userId: activeUser.uid,
        templateType: selectedStyle,
        timestamp: new Date().toISOString(),
        status: 'pending',
        errorType: null,
        imageUrl: '',
        templateStyle: selectedStyle,
        name: nameInput || 'UNTITLED PRINT',
        caption: captionInput,
        createdAt: Date.now(),
        photoMode: photoMode
      });

      const { base64: base64Data, mimeType: compressedMimeType } = await compressAndPrepareImage(selectedFile);

      // Log the full request payload being sent to the backend proxy
      console.log("Sending API request payload to /api/generate:", {
        imagePresent: !!base64Data,
        imageLength: base64Data ? base64Data.length : 0,
        mimeType: compressedMimeType,
        templateStyle: selectedStyle,
        name: nameInput,
        caption: captionInput,
        photoMode: photoMode
      });

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          mimeType: compressedMimeType,
          templateStyle: selectedStyle,
          name: nameInput,
          caption: captionInput,
          photoMode: photoMode
        }),
      });

      let data;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text().catch(() => '');
        console.error('Non-JSON response received:', textResponse);
        const errorObj = new Error('Our chemical darkroom encountered an integration error. Please retry.') as any;
        errorObj.status = response.status;
        errorObj.details = textResponse;
        throw errorObj;
      }

      if (!response.ok) {
        const errMsg = data?.error || 'A developer failure occurred during rendering.';
        const errorObj = new Error(errMsg) as any;
        errorObj.status = response.status;
        errorObj.details = data?.details || errMsg;
        errorObj.stack = data?.stack || new Error().stack;
        throw errorObj;
      }

      if (!data.variations || data.variations.length === 0) {
        throw new Error('Emulsion failed to capture variations. Please supply another portrait.');
      }

      setVariations(data.variations);
      setActiveVariationIdx(0);

      // Succeeded! Update document
      if (generationDocRef) {
        await updateDoc(generationDocRef, {
          status: 'success',
          imageUrl: data.variations[0]
        });

        // Add secondary variations as successful records if there are multiple
        for (let i = 1; i < data.variations.length; i++) {
          await addDoc(collection(db, 'generations'), {
            userId: activeUser.uid,
            templateType: selectedStyle,
            timestamp: new Date().toISOString(),
            status: 'success',
            errorType: null,
            imageUrl: data.variations[i],
            templateStyle: selectedStyle,
            name: nameInput ? `${nameInput} (Var ${i+1})` : `UNTITLED PRINT (Var ${i+1})`,
            caption: captionInput,
            createdAt: Date.now(),
            photoMode: photoMode
          }).catch((err) => console.warn("Could not add additional variation to history:", err));
        }
      }

      // Increment totalGenerations in users collection:
      const userDocRef = doc(db, 'users', activeUser.uid);
      await updateDoc(userDocRef, {
        totalGenerations: increment(1)
      }).catch((err) => {
        console.warn("Could not increment totalGenerations on user:", err);
      });

      // Set hasGeneratedOnce to true in Firestore:
      if (!hasGeneratedOnce) {
        await updateDoc(userDocRef, {
          hasGeneratedOnce: true
        }).catch((err) => {
          console.warn("Could not update hasGeneratedOnce on user document:", err);
        });
        setHasGeneratedOnce(true);
      }

    } catch (err: any) {
      console.error('Print generation failed:', err);
      
      // 1. Log the full error (status code, message, and stack trace) to the browser console when generation fails
      console.error('--- BROWSER CONSOLE: DETAILED ERROR LOG ---');
      console.error('Status Code:', err.status || 'N/A');
      console.error('Error Message:', err.message || err);
      console.error('Response Details:', err.details || 'N/A');
      console.error('Stack Trace:', err.stack || 'N/A');
      console.error('Full Error Object:', err);
      console.error('-------------------------------------------');

      let errorMsg = err.message || 'Chemical developer timeout. Please try another image.';
      
      if (err.status === 429 || String(err.message).toLowerCase().includes('429') || String(err.message).toLowerCase().includes('rate limit') || String(err.message).toLowerCase().includes('high demand') || String(err.message).toLowerCase().includes('quota') || String(err.message).toLowerCase().includes('resource_exhausted')) {
        errorMsg = "High demand right now, please try again shortly";
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMsg = "Guest access (Anonymous Authentication) is disabled in your Firebase project. To allow guest generations, please turn on 'Anonymous' under Build > Authentication > Sign-in method in your Firebase Console. Alternatively, sign in using your Google account to start immediately!";
      }
      
      setGenerationError(errorMsg);

      // Map error messages to standard error types: "rate-limit", "invalid-image", "timeout", "generation-failed"
      let errorType = 'generation-failed';
      const lowMsg = errorMsg.toLowerCase();
      const lowOrigMsg = String(err.message || '').toLowerCase();
      if (err.status === 429 || lowMsg.includes('demand') || lowMsg.includes('rate') || lowMsg.includes('limit') || lowOrigMsg.includes('429') || lowOrigMsg.includes('rate') || lowOrigMsg.includes('limit') || lowOrigMsg.includes('quota') || lowOrigMsg.includes('resource_exhausted')) {
        errorType = 'rate-limit';
      } else if (lowMsg.includes('image') || lowMsg.includes('face') || lowMsg.includes('portrait')) {
        errorType = 'invalid-image';
      } else if (lowMsg.includes('timeout') || lowMsg.includes('time')) {
        errorType = 'timeout';
      }

      if (generationDocRef) {
        await updateDoc(generationDocRef, {
          status: 'failed',
          errorType: errorType
        }).catch((fErr) => console.warn("Failed to update status on error:", fErr));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (imageUrl: string, options?: { highRes?: boolean }) => {
    const isHighRes = options?.highRes;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        
        if (!isHighRes) {
          const fontSize = Math.max(16, Math.floor(canvas.width * 0.024));
          ctx.font = `600 ${fontSize}px "Space Grotesk", sans-serif`;
          
          const text = "PIXCRAFT PRINT LAB";
          const textWidth = ctx.measureText(text).width;
          const padding = 16;
          const margin = 20;

          ctx.fillStyle = 'rgba(27, 42, 74, 0.9)'; // Dark navy background
          ctx.fillRect(
            canvas.width - textWidth - padding * 2 - margin,
            canvas.height - fontSize - padding * 2 - margin,
            textWidth + padding * 2,
            fontSize + padding * 1.5
          );
          
          ctx.fillStyle = '#ffffff';
          ctx.fillText(
            text, 
            canvas.width - textWidth - padding - margin, 
            canvas.height - padding - margin - 4
          );
        }
        
        const link = document.createElement('a');
        link.download = isHighRes 
          ? `PixCraft_Raw_HighRes_${selectedStyle}_${Date.now()}.png`
          : `PixCraft_Print_${selectedStyle}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', isHighRes ? 1.0 : undefined);
        link.click();
      }
    };
    img.src = imageUrl;
  };

  const handleExportRaw = (imageUrl: string) => {
    handleDownload(imageUrl, { highRes: true });
  };

  const handleExportPDF = (imageUrl: string) => {
    setIsExportingPDF(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          // Render the watermark (PIXCRAFT PRINT LAB) onto the PDF version
          const fontSize = Math.max(16, Math.floor(canvas.width * 0.024));
          ctx.font = `600 ${fontSize}px "Space Grotesk", sans-serif`;
          
          const text = "PIXCRAFT PRINT LAB";
          const textWidth = ctx.measureText(text).width;
          const padding = 16;
          const margin = 20;

          ctx.fillStyle = 'rgba(27, 42, 74, 0.9)'; // Dark navy background
          ctx.fillRect(
            canvas.width - textWidth - padding * 2 - margin,
            canvas.height - fontSize - padding * 2 - margin,
            textWidth + padding * 2,
            fontSize + padding * 1.5
          );
          
          ctx.fillStyle = '#ffffff';
          ctx.fillText(
            text, 
            canvas.width - textWidth - padding - margin, 
            canvas.height - padding - margin - 4
          );

          // Instantiate jsPDF with custom print dimensions
          const pdf = new jsPDF({
            orientation: img.width > img.height ? 'l' : 'p',
            unit: 'px',
            format: [img.width, img.height] as [number, number]
          });
          
          // Add the watermarked canvas output to the PDF
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, img.width, img.height);
          pdf.save(`PixCraft_Print_${selectedStyle}_${Date.now()}.pdf`);
        }
      } catch (error) {
        console.error('Error exporting PDF:', error);
      } finally {
        setIsExportingPDF(false);
      }
    };
    img.onerror = () => {
      console.error('Image load failed for PDF export');
      setIsExportingPDF(false);
    };
    img.src = imageUrl;
  };

  const getWatermarkedBlob = (imageUrl: string, style: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          const fontSize = Math.max(16, Math.floor(canvas.width * 0.024));
          ctx.font = `600 ${fontSize}px "Space Grotesk", sans-serif`;
          
          const text = "PIXCRAFT PRINT LAB";
          const textWidth = ctx.measureText(text).width;
          const padding = 16;
          const margin = 20;

          ctx.fillStyle = 'rgba(27, 42, 74, 0.9)'; // Dark navy background
          ctx.fillRect(
            canvas.width - textWidth - padding * 2 - margin,
            canvas.height - fontSize - padding * 2 - margin,
            textWidth + padding * 2,
            fontSize + padding * 1.5
          );
          
          ctx.fillStyle = '#ffffff';
          ctx.fillText(
            text, 
            canvas.width - textWidth - padding - margin, 
            canvas.height - padding - margin - 4
          );
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob failed'));
            }
          }, 'image/png');
        } else {
          reject(new Error('Could not get canvas 2d context'));
        }
      };
      img.onerror = () => {
        reject(new Error('Image load failed'));
      };
      img.src = imageUrl;
    });
  };

  const handleBatchDownload = async () => {
    if (selectedArchiveIds.length === 0) return;
    setIsPackagingZip(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      let count = 0;

      for (const id of selectedArchiveIds) {
        const item = userHistory.find((h) => h.id === id);
        if (!item) continue;

        let fileBlob: Blob;
        let extension = 'png';

        try {
          // Attempt to get watermarked image
          fileBlob = await getWatermarkedBlob(item.imageUrl, item.templateStyle);
        } catch (watermarkErr) {
          console.warn('Watermarking failed for batch item, falling back to raw fetch:', watermarkErr);
          // Fallback to fetching raw image
          if (item.imageUrl.startsWith('data:')) {
            const parts = item.imageUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
            const base64 = parts[1];
            const binary = atob(base64);
            const array = [];
            for (let i = 0; i < binary.length; i++) {
              array.push(binary.charCodeAt(i));
            }
            fileBlob = new Blob([new Uint8Array(array)], { type: mime });
          } else {
            const response = await fetch(item.imageUrl);
            fileBlob = await response.blob();
          }
        }

        const contentType = fileBlob.type || 'image/png';
        extension = contentType.split('/')[1] || 'png';

        const safeName = (item.name || 'UNTITLED')
          .replace(/[^a-z0-9]/gi, '_')
          .toUpperCase();
        const filename = `PRINT_${item.templateStyle.toUpperCase()}_${safeName}_${item.id.slice(-6)}.${extension}`;

        zip.file(filename, fileBlob);

        count++;
        setZipProgress(Math.round((count / selectedArchiveIds.length) * 100));
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipContent);
      link.download = `PIXCRAFT_DARKROOM_BATCH_${Date.now()}.zip`;
      link.click();

      // Reset selection and mode
      setSelectedArchiveIds([]);
      setIsBatchMode(false);
    } catch (err) {
      console.error('Batch ZIP process failed:', err);
      alert('Batch packaging failed. Please check network connectivity and try again.');
    } finally {
      setIsPackagingZip(false);
      setZipProgress(0);
    }
  };

  const handleCopyToClipboard = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Copy to clipboard failed, trying fallback:', err);
      try {
        await navigator.clipboard.writeText(imageUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (innerErr) {
        alert("Clipboard copy rejected. Right-click the image and select 'Copy Image'.");
      }
    }
  };

  // Consistent Corner-Mark Registration Detail
  const CornerMarks = () => (
    <>
      <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-[#1B2A4A] opacity-70"></div>
      <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t border-r border-[#1B2A4A] opacity-70"></div>
      <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b border-l border-[#1B2A4A] opacity-70"></div>
      <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-[#1B2A4A] opacity-70"></div>
    </>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans text-[#1A1918]">
        <div className="h-10 w-10 border border-[#1B2A4A] border-t-transparent animate-spin rounded-none"></div>
        <p className="text-xs font-mono tracking-widest mt-4 uppercase text-[#1B2A4A]">CALIBRATING DARKROOM PROCESSORS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1A1918] font-sans flex flex-col selection:bg-[#C9822E] selection:text-white">
      
      {/* ==================== 1. LANDING PAGE ==================== */}
      {currentScreen === 'landing' && (
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="border-b border-[#E4E1D8] bg-[#FAFAF8] px-4 py-4 sm:px-6 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="border border-[#1B2A4A] p-2 text-[#1B2A4A] flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-display font-bold uppercase tracking-wider text-[#1B2A4A] leading-none">
                    PIXCRAFT
                  </h1>
                  <p className="text-[9px] font-mono tracking-widest text-[#1B2A4A]/70 uppercase">PRINT LAB // PORTRAIT GRAPHICS</p>
                </div>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs">
                <button 
                  onClick={() => { setAuthMode('login'); setCurrentScreen('auth'); }}
                  className="text-[#1A1918] hover:text-[#1B2A4A] font-bold uppercase tracking-wide transition-colors"
                >
                  Log In
                </button>
                <button 
                  onClick={() => { setAuthMode('signup'); setCurrentScreen('auth'); }}
                  className="bg-[#C9822E] hover:bg-[#b06f23] text-white font-bold uppercase tracking-wider px-4 py-2.5 transition-colors"
                >
                  Get Started
                </button>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <section className="py-12 md:py-20 px-4 sm:px-6 bg-white border-b border-[#E4E1D8]">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 bg-[#FAFAF8] border border-[#E4E1D8] px-3 py-1 font-mono text-[10px] text-[#1B2A4A] uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" /> PRINT EXPOSURE V1.3
                </div>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-[#1B2A4A] uppercase tracking-tight leading-[1.05]">
                  Expose Your Portrait <br />
                  <span className="text-[#C9822E]">Into Designed Art</span>
                </h2>
                <p className="text-sm sm:text-base text-[#1A1918]/85 max-w-xl leading-relaxed">
                  Transform any personal headshot or family photo into a masterfully rendered graphic template. Turn raw captures into festive greeting cards, formal identity prints, milestone posters, or modern professional banners instantly.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 font-mono">
                  <button
                    onClick={() => { setAuthMode('signup'); setCurrentScreen('auth'); }}
                    className="bg-[#C9822E] hover:bg-[#b06f23] text-white font-bold uppercase tracking-widest px-8 py-4 transition-colors text-xs flex items-center justify-center gap-2"
                  >
                    Get Started <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { setAuthMode('login'); setCurrentScreen('auth'); }}
                    className="border border-[#1B2A4A] hover:bg-[#1B2A4A]/5 text-[#1B2A4A] font-bold uppercase tracking-wider px-6 py-4 transition-all text-xs text-center"
                  >
                    Returning User? Login
                  </button>
                </div>
              </div>

              {/* Schematic Before/After mockup */}
              <div className="lg:col-span-6">
                <div className="bg-[#FAFAF8] border border-[#E4E1D8] p-6 relative w-full max-w-xl mx-auto">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    {/* Before Column */}
                    <div className="w-full sm:w-1/2 flex flex-col items-center space-y-3">
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">[ INPUT PORTRAIT ]</p>
                      <div className="relative aspect-[3/4] w-full bg-white border border-[#E4E1D8] flex items-center justify-center p-3">
                        <CornerMarks />
                        <svg className="w-24 h-24 text-[#1B2A4A]/20" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        <div className="absolute inset-x-3 bottom-3 border-t border-[#E4E1D8] pt-1 text-center">
                          <p className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider">RAW EXPOSURE // 400 ISO</p>
                        </div>
                      </div>
                    </div>

                    {/* Arrow Indicator */}
                    <div className="flex flex-row sm:flex-col items-center justify-center text-[#1B2A4A]">
                      <ArrowRight className="h-5 w-5 transform rotate-90 sm:rotate-0" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-center mt-1 hidden sm:block">CHEM<br/>LAB</span>
                    </div>

                    {/* After Column */}
                    <div className="w-full sm:w-1/2 flex flex-col items-center space-y-3">
                      <p className="text-[10px] font-mono text-[#C9822E] uppercase tracking-widest">[ COMPLETED PRINT ]</p>
                      <div className="relative aspect-[3/4] w-full bg-amber-50/20 border border-[#C9822E]/40 flex flex-col items-center justify-between p-3 overflow-hidden">
                        <CornerMarks />
                        {/* Decorative golden patterns inside */}
                        <div className="absolute inset-1 border border-dashed border-[#C9822E]/30 pointer-events-none"></div>
                        <div className="text-[8px] font-mono text-[#C9822E] font-bold tracking-widest mt-1">★ SEASONAL FESTIVAL ★</div>
                        <svg className="w-16 h-16 text-[#1B2A4A]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        <div className="w-full text-center space-y-0.5 z-10">
                          <p className="text-[9px] font-bold font-display uppercase tracking-wide text-[#1B2A4A]">ALEX JOHNSON</p>
                          <p className="text-[7px] font-mono text-[#C9822E] uppercase tracking-wider">SEASONAL AMBASSADOR</p>
                        </div>
                        <div className="text-[6px] font-mono text-zinc-400 uppercase">PIXCRAFT EXPOSURE DEV</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* "What's Included" Section */}
          <section className="py-16 px-4 sm:px-6 bg-[#FAFAF8] border-b border-[#E4E1D8]">
            <div className="max-w-7xl mx-auto space-y-12">
              <div className="text-center space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[#1B2A4A] font-bold">AVAILABLE DEVELOPMENTS</h3>
                <h4 className="text-2xl sm:text-3xl font-display font-bold text-[#1B2A4A] uppercase tracking-wide">
                  EXQUISITE TEMPLATE SPECIFICATIONS
                </h4>
                <div className="w-12 h-1 bg-[#1B2A4A] mx-auto mt-4"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono">
                {TEMPLATES.map((tpl) => (
                  <div 
                    key={tpl.id} 
                    className="bg-white border border-[#E4E1D8] p-6 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-zinc-400">▲ FRAME {tpl.frameNum}</span>
                        <span className="text-[9px] font-bold bg-[#1B2A4A]/5 text-[#1B2A4A] border border-[#1B2A4A]/25 px-2 py-0.5">{tpl.badge}</span>
                      </div>
                      <h5 className="text-base font-bold font-display text-[#1B2A4A] uppercase tracking-wider">{tpl.label}</h5>
                      <p className="text-xs text-zinc-600 leading-relaxed">{tpl.longDesc}</p>
                    </div>
                    <div className="border-t border-[#E4E1D8] pt-3 text-[10px] text-[#C9822E] uppercase tracking-wide font-bold">
                      EXPOSURE PATH READY
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Global Stats bar */}
          <section className="py-8 bg-white border-b border-[#E4E1D8] text-center font-mono text-xs text-[#1A1918]">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 px-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-[#C9822E] rounded-none inline-block"></span>
                <span>SYSTEM ACTIVE</span>
              </div>
              <div className="h-px w-8 bg-[#E4E1D8] hidden sm:block"></div>
              <div>
                <span>SECURE EMULSION PROCESSING SPEED: </span>
                <span className="font-bold text-[#1B2A4A]">~5-8 SECONDS / EXPOSURE</span>
              </div>
              <div className="h-px w-8 bg-[#E4E1D8] hidden sm:block"></div>
              <div>
                <span>TOTAL PRINTS SECURED GLOBALLY: </span>
                <span className="font-bold text-[#C9822E]">{globalCount}</span>
              </div>
            </div>
          </section>

          {/* Bottom Call to Action Band */}
          <footer className="bg-[#1B2A4A] text-white py-16 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h4 className="text-2xl sm:text-4xl font-display font-bold uppercase tracking-wider">
                Expose Your Portrait Print Today
              </h4>
              <p className="text-sm font-mono text-zinc-300 uppercase tracking-wide">
                Start crafting high-fidelity variations. No payment required. Complete guest exposure trial instantly.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => { setAuthMode('signup'); setCurrentScreen('auth'); }}
                  className="bg-[#C9822E] hover:bg-[#b06f23] text-white font-mono font-bold uppercase tracking-widest px-8 py-4 text-xs transition-colors rounded-none"
                >
                  GET STARTED FOR FREE
                </button>
              </div>
              <p className="text-[10px] font-mono text-zinc-400 pt-8 uppercase">
                © 2026 PIXCRAFT PRINT LABORATORIES. ALL EXPOSURES CONSERVED UNDER USER DECREE.
              </p>
            </div>
          </footer>
        </div>
      )}

      {/* ==================== 2. AUTHENTICATION PAGE ==================== */}
      {currentScreen === 'auth' && (
        <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
          {/* Top Back Link */}
          <div className="absolute top-6 left-6 font-mono text-xs">
            <button 
              onClick={() => setCurrentScreen('landing')}
              className="text-[#1A1918] hover:text-[#1B2A4A] flex items-center gap-1 uppercase tracking-wider font-bold transition-colors"
            >
              ← Return to Home
            </button>
          </div>

          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center">
              <div className="border border-[#1B2A4A] p-3 text-[#1B2A4A]">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <h2 className="mt-4 text-center text-3xl font-display font-bold uppercase tracking-widest text-[#1B2A4A]">
              {authMode === 'signup' ? 'REGISTER LAB PORT' : 'AUTHENTICATE ACCESS'}
            </h2>
            <p className="mt-1 text-center text-xs font-mono uppercase text-zinc-500 tracking-wider">
              {authMode === 'signup' ? 'CREATE SECURE ACCOUNT TO RECORD PRINTS' : 'ENTER AUTHORIZED SYSTEM CREDENTIALS'}
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 border border-[#E4E1D8] sm:px-10">
              
              {authError && (
                <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 font-mono flex gap-2 items-start">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <p>{authError}</p>
                </div>
              )}

              <form className="space-y-4 font-mono text-xs" onSubmit={authMode === 'signup' ? handleEmailSignUp : handleEmailLogin}>
                
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#1B2A4A] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ALEX JOHNSON"
                      value={nameFormInput}
                      onChange={(e) => setNameFormInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-none bg-[#FAFAF8] border border-[#E4E1D8] text-[#1A1918] placeholder-zinc-400 focus:outline-none focus:border-[#1B2A4A] uppercase"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#1B2A4A] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ALEX@LAB.COM"
                    value={emailFormInput}
                    onChange={(e) => setEmailFormInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-none bg-[#FAFAF8] border border-[#E4E1D8] text-[#1A1918] placeholder-zinc-400 focus:outline-none focus:border-[#1B2A4A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#1B2A4A] mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordFormInput}
                    onChange={(e) => setPasswordFormInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-none bg-[#FAFAF8] border border-[#E4E1D8] text-[#1A1918] placeholder-zinc-400 focus:outline-none focus:border-[#1B2A4A]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full py-3 bg-[#C9822E] hover:bg-[#b06f23] text-white font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    {isAuthLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        PROCESSING CREDENTIALS...
                      </>
                    ) : authMode === 'signup' ? (
                      'CREATE ACCOUNT'
                    ) : (
                      'AUTHORIZE ACCESS'
                    )}
                  </button>
                </div>
              </form>

              {/* Dividers */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E4E1D8]"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] font-mono uppercase">
                    <span className="bg-white px-2 text-zinc-500">Or Federated Exposure Sign-in</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 font-mono">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full py-2.5 border border-[#E4E1D8] hover:bg-[#FAFAF8] text-xs font-bold text-[#1A1918] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.14-5.174 4.14-3.41 0-6.177-2.767-6.177-6.177S10.54 6.185 13.95 6.185c1.55 0 2.96.57 4.05 1.51l3.05-3.05C19.12 2.87 16.71 2 13.95 2 8.43 2 4 6.43 4 11.95s4.43 9.95 9.95 9.95c6.24 0 10.22-4.29 10.22-10.39 0-.61-.06-1.12-.17-1.62H12.24z"/>
                    </svg>
                    Google Auth
                  </button>

                  <button
                    type="button"
                    onClick={handleGuestSignIn}
                    className="w-full py-2.5 border border-[#E4E1D8] hover:bg-[#FAFAF8] text-xs font-bold text-[#1A1918] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserCheck className="h-4 w-4 text-[#1B2A4A]" />
                    Guest Port
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="mt-6 border-t border-[#E4E1D8] pt-4 text-center font-mono text-[10px]">
                {authMode === 'signup' ? (
                  <p className="text-zinc-500 uppercase">
                    Already registered?{' '}
                    <button 
                      onClick={() => { setAuthMode('login'); setAuthError(null); }} 
                      className="text-[#C9822E] font-bold hover:underline"
                    >
                      Log In to Lab
                    </button>
                  </p>
                ) : (
                  <p className="text-zinc-500 uppercase">
                    New laboratory operator?{' '}
                    <button 
                      onClick={() => { setAuthMode('signup'); setAuthError(null); }} 
                      className="text-[#C9822E] font-bold hover:underline"
                    >
                      Register Account
                    </button>
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. WELCOME SCREEN ==================== */}
      {currentScreen === 'welcome' && (
        <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full bg-white border border-[#E4E1D8] p-8 text-center relative">
            <CornerMarks />

            <div className="flex justify-center mb-6">
              <div className="border border-[#1B2A4A] p-3 text-[#1B2A4A]">
                <PartyPopper className="h-8 w-8 text-[#C9822E]" />
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-widest text-[#1B2A4A] leading-tight">
              WELCOME, <br />
              <span className="border-b-2 border-[#C9822E]/80 pb-1 inline-block uppercase mt-1">
                {user?.displayName || 'CREATOR'}
              </span>
            </h3>

            <p className="mt-6 text-xs font-mono uppercase text-zinc-500 tracking-wider">
              ONBOARDING ENVELOPE SECURED
            </p>

            <p className="mt-3 text-sm text-[#1A1918]/85 leading-relaxed">
              Your personal design darkroom console is fully configured and ready. Prepare your photographs to be processed into gorgeous Custom Prints. Save unlimited creations, manage past negatives, and configure bespoke overlays.
            </p>

            <div className="mt-8 font-mono">
              <button
                onClick={handleCompleteWelcome}
                className="w-full py-3.5 bg-[#C9822E] hover:bg-[#b06f23] text-white font-bold uppercase tracking-widest text-xs transition-colors"
              >
                GO TO DASHBOARD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. DASHBOARD SCREEN ==================== */}
      {currentScreen === 'dashboard' && (
        <div className="flex-grow flex flex-col md:flex-row min-h-screen bg-white">
          
          {/* Navigation Sidebar (Desktop) / Top Nav (Mobile) */}
          <nav className="bg-[#1B2A4A] text-white md:w-64 md:shrink-0 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E4E1D8]">
            <div className="flex flex-col">
              
              {/* Sidebar Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#C9822E]" />
                  <div>
                    <h2 className="text-sm font-display font-bold uppercase tracking-wider text-white">PIXCRAFT PRINT LAB</h2>
                    <p className="text-[8px] font-mono uppercase text-white/50 tracking-wider">CONSOLE CONSOLE-v1.3</p>
                  </div>
                </div>
                {/* Mobile sign out option */}
                <button 
                  onClick={handleLogout}
                  title="Sign Out"
                  className="md:hidden text-white/70 hover:text-[#C9822E] transition-colors p-1"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              {/* Sidebar Profile summary */}
              <div className="p-4 bg-white/5 border-b border-white/10 hidden md:block">
                <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest">ACTIVE OPERATOR</p>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <div className="bg-[#C9822E]/20 text-[#C9822E] h-7 w-7 rounded-none border border-[#C9822E]/40 flex items-center justify-center font-mono font-bold text-xs uppercase">
                    {user?.email ? user.email[0] : 'G'}
                  </div>
                  <div className="truncate min-w-0">
                    <p className="text-xs font-bold truncate text-white uppercase">{user?.displayName || 'GUEST'}</p>
                    <p className="text-[9px] font-mono text-white/60 truncate">{user?.isAnonymous ? 'GUEST_EXPOSURE' : user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="p-4 space-y-2 font-mono text-xs">
                <button
                  onClick={() => setShowHistoryTab(false)}
                  className={`w-full text-left px-3.5 py-3 rounded-none uppercase tracking-wider transition-colors flex items-center gap-2 ${
                    !showHistoryTab 
                      ? 'bg-white text-[#1B2A4A] font-bold' 
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Grid className="h-3.5 w-3.5" />
                  WORKSPACE
                </button>

                <button
                  onClick={() => setShowHistoryTab(true)}
                  className={`w-full text-left px-3.5 py-3 rounded-none uppercase tracking-wider transition-colors flex items-center justify-between ${
                    showHistoryTab 
                      ? 'bg-white text-[#1B2A4A] font-bold' 
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5" />
                    EXPOSED ARCHIVE
                  </span>
                  <span className="bg-[#C9822E]/20 text-[#C9822E] font-bold px-1.5 text-[10px] border border-[#C9822E]/30">
                    {userHistory.length}
                  </span>
                </button>

                {user?.email === 'rkamuju39@gmail.com' && (
                  <button
                    onClick={() => {
                      setCurrentScreen('admin');
                      window.history.pushState({}, '', '/admin');
                    }}
                    className="w-full text-left px-3.5 py-3 rounded-none uppercase tracking-wider transition-colors flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/5 border border-dashed border-[#C9822E]/35 mt-1.5"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-[#C9822E]" />
                    ADMIN PORTAL
                  </button>
                )}
              </div>

            </div>

            {/* Sidebar Bottom */}
            <div className="p-4 border-t border-white/10 hidden md:flex flex-col gap-4 font-mono">
              {/* Counter status */}
              <div className="bg-white/5 p-2.5 border border-white/10">
                <p className="text-[8px] text-white/40 uppercase tracking-widest">GLOBAL EXPOSURES</p>
                <p className="text-base font-bold text-[#C9822E] mt-0.5">{globalCount} PRINTS</p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2.5 border border-white/20 hover:border-white/50 text-[10px] text-white/80 font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="h-3 w-3" />
                TERMINATE SESSION
              </button>
            </div>
          </nav>

          {/* Main Workspace Content Area */}
          <main className="flex-grow p-4 sm:p-6 lg:p-8 bg-white overflow-y-auto">
            
            <AnimatePresence mode="wait">
              {!showHistoryTab ? (
                /* MAIN 3-STEP GENERATOR PANEL */
                <motion.div 
                  key="generator"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
                >
                  {/* Left Controls */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="border border-[#E4E1D8] p-5 sm:p-6 space-y-6 bg-white relative">
                      
                      <div className="border-b border-[#E4E1D8] pb-4">
                        <h2 className="text-lg font-bold font-display uppercase tracking-wider text-[#1B2A4A] flex items-center gap-2">
                          <Grid className="h-4 w-4" />
                          DESIGN WORKSPACE
                        </h2>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mt-1">EXPOSE SOURCE PORTRAIT & CHOOSE THEME</p>
                      </div>

                      {/* Step 1: Upload Face Photo */}
                      <div className="space-y-3">
                        <label className="block text-xs font-mono uppercase tracking-wider text-[#1B2A4A] font-bold">
                          [SECTION_01] UPLOAD SOURCE NEGATIVE
                        </label>
                        
                        <div 
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border border-dashed p-6 flex flex-col items-center justify-center cursor-pointer transition-all relative ${
                            dragActive 
                              ? 'border-[#C9822E] bg-amber-50/10' 
                              : 'border-[#E4E1D8] bg-[#FAFAF8] hover:border-[#C9822E]/45'
                          }`}
                        >
                          <input 
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg"
                            className="hidden"
                            onChange={handleFileChange}
                          />

                          {imagePreview ? (
                            <div className="flex flex-col items-center gap-3 z-10">
                              <div className="relative group p-1.5 bg-white border border-[#E4E1D8]">
                                <img 
                                  src={imagePreview} 
                                  alt="Portrait Source Preview" 
                                  className={`w-24 h-24 object-cover filter transition-all duration-300 ${
                                    portraitFilter === 'monochrome'
                                      ? 'grayscale contrast-125 brightness-95'
                                      : portraitFilter === 'sepia'
                                        ? 'sepia brightness-90 contrast-110 saturate-110'
                                        : portraitFilter === 'high-contrast'
                                          ? 'contrast-150 saturate-125 brightness-100'
                                          : ''
                                  }`}
                                />
                                <div className="absolute inset-1.5 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <RefreshCw className="h-5 w-5 text-[#C9822E] animate-spin" />
                                </div>
                              </div>
                              <div className="text-center">
                                <p className="text-xs font-mono text-[#C9822E] uppercase tracking-wide flex items-center justify-center gap-1">
                                   <Check className="h-3 w-3" /> EXPOSURE READY
                                </p>
                                <p className="text-[9px] font-mono text-zinc-500 mt-1 truncate max-w-[200px] uppercase">
                                  {selectedFile?.name}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center space-y-2 z-10">
                              <div className="bg-white border border-[#E4E1D8] p-3 max-w-fit mx-auto text-zinc-400">
                                <Upload className="h-5 w-5 text-[#1B2A4A]" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#1B2A4A] uppercase tracking-wide">DRAG & DROP PORTRAIT, OR BROWSE</p>
                                <p className="text-[9px] font-mono text-zinc-500 mt-1 uppercase">JPG, PNG (MAX 5MB EXPOSURE LIMIT)</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {imagePreview && (
                          <div className="space-y-2 mt-3 p-3 bg-[#FAFAF8] border border-[#E4E1D8] rounded-none">
                            <span className="block text-[10px] font-mono uppercase tracking-widest text-[#1B2A4A] font-bold">
                              ▲ [FILTER EFFECTS] SELECT DEVELOPMENT FILTER
                            </span>
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                              {[
                                { id: 'none', label: 'ORIGINAL' },
                                { id: 'monochrome', label: 'MONOCHROME' },
                                { id: 'sepia', label: 'SEPIA' },
                                { id: 'high-contrast', label: 'HI-CONTRAST' },
                              ].map((f) => {
                                const isActive = portraitFilter === f.id;
                                return (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setPortraitFilter(f.id as any)}
                                    className={`py-1.5 px-1 text-[9px] font-mono uppercase tracking-tight text-center border font-semibold transition-all ${
                                      isActive
                                        ? 'bg-[#1B2A4A] border-[#1B2A4A] text-white'
                                        : 'bg-white border-[#E4E1D8] text-[#1B2A4A] hover:border-[#1B2A4A]/40'
                                    }`}
                                  >
                                    {f.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Photo Mode Selector - Only shown after user uploads a photo */}
                      {selectedFile && (
                        <div className="space-y-3 p-4 bg-[#FAFAF8] border border-[#E4E1D8] relative">
                          <CornerMarks />
                          <label className="block text-xs font-mono uppercase tracking-wider text-[#1B2A4A] font-bold">
                            [MODE SELECTOR] SELECT PHOTO CHARACTERISTIC
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => setPhotoMode('face')}
                              className={`text-left p-3.5 border transition-all flex flex-col justify-between relative overflow-hidden group ${
                                photoMode === 'face'
                                  ? 'border-2 border-[#1B2A4A] bg-white shadow-[inset_0_0_0_1px_#1B2A4A]'
                                  : 'border-[#E4E1D8] bg-[#FAFAF8] hover:border-[#1B2A4A]/30'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-1 z-10">
                                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                                  photoMode === 'face' ? 'text-[#1B2A4A]' : 'text-zinc-500'
                                }`}>
                                  👤 Face Photo
                                </span>
                                <span className="text-[10px] font-mono font-bold text-[#C9822E]">
                                  {photoMode === 'face' ? '[SELECTED]' : ''}
                                </span>
                              </div>
                              <p className="text-[9px] text-zinc-500 uppercase font-mono leading-relaxed z-10">
                                Best for portraits, selfies, or headshots. Applies face-centric optimization rules.
                              </p>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPhotoMode('object')}
                              className={`text-left p-3.5 border transition-all flex flex-col justify-between relative overflow-hidden group ${
                                photoMode === 'object'
                                  ? 'border-2 border-[#1B2A4A] bg-white shadow-[inset_0_0_0_1px_#1B2A4A]'
                                  : 'border-[#E4E1D8] bg-[#FAFAF8] hover:border-[#1B2A4A]/30'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-1 z-10">
                                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                                  photoMode === 'object' ? 'text-[#1B2A4A]' : 'text-zinc-500'
                                }`}>
                                  🐾 Object / Other Photo
                                </span>
                                <span className="text-[10px] font-mono font-bold text-[#C9822E]">
                                  {photoMode === 'object' ? '[SELECTED]' : ''}
                                </span>
                              </div>
                              <p className="text-[9px] text-zinc-500 uppercase font-mono leading-relaxed z-10">
                                Best for pets, products, objects, landscapes. Preserves proportions without face assumption.
                              </p>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Step 2: Choose Template Theme */}
                      <div className="space-y-3">
                        <label className="block text-xs font-mono uppercase tracking-wider text-[#1B2A4A] font-bold">
                          [SECTION_02] SELECT TEMPLATE EXPOSURE
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {TEMPLATES.map((tpl) => {
                            const isSelected = selectedStyle === tpl.id;
                            return (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => {
                                  setSelectedStyle(tpl.id);
                                  // Clear previous results as requested so they can generate again with the new template without losing photo
                                  setVariations([]);
                                  setActiveVariationIdx(0);
                                }}
                                className={`text-left p-3.5 border transition-all flex flex-col justify-between h-28 relative overflow-hidden group ${
                                  isSelected 
                                    ? 'border-2 border-[#1B2A4A] bg-[#FAFAF8] shadow-[inset_0_0_0_1px_#1B2A4A]' 
                                    : 'border-[#E4E1D8] bg-white hover:border-[#1B2A4A]/30'
                                }`}
                              >
                                <CornerMarks />
                                <div className="space-y-1.5 z-10 flex flex-col h-full justify-between w-full">
                                  <div className="flex justify-between items-start w-full font-mono">
                                    <span className="text-[10px] font-bold text-[#C9822E]">
                                      ▲ {tpl.frameNum}
                                    </span>
                                    {photoMode === 'object' && tpl.id === 'idcard' ? (
                                      <span className="text-[7px] text-amber-600 bg-amber-50 border border-amber-200 px-1 py-0.5 font-bold tracking-tight uppercase animate-pulse">
                                        ⚠️ BEST WITH FACE
                                      </span>
                                    ) : (
                                      <span className="text-[8px] text-zinc-400 font-bold tracking-wider">
                                        {tpl.badge}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#1B2A4A] font-display">{tpl.label}</h3>
                                    <p className="text-[9px] text-zinc-500 line-clamp-2 mt-0.5 leading-tight uppercase font-mono">{tpl.description}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected Template Preview Panel */}
                        {selectedStyle && (
                          <div className="mt-3 p-3 bg-[#FAFAF8] border border-[#E4E1D8] flex flex-col sm:flex-row gap-4 items-start">
                            {/* Visual Mockup representation */}
                            <div className="w-24 h-18 bg-zinc-950 flex items-center justify-center relative overflow-hidden border border-[#E4E1D8] shrink-0 shadow-inner">
                              {selectedStyle === 'festival' && (
                                <div className="absolute inset-0 flex flex-col justify-between p-1.5 border-4 border-[#C9822E]/80 text-[#C9822E]">
                                  <div className="flex justify-between text-[6px] font-mono">
                                    <span>★ FESTIVAL</span>
                                    <span>★</span>
                                  </div>
                                  <div className="flex flex-col items-center justify-center grow">
                                    <div className="w-5 h-5 rounded-full border border-dashed border-[#C9822E]/60 flex items-center justify-center">
                                      <span className="text-[7px]">✨</span>
                                    </div>
                                  </div>
                                  <div className="h-1 bg-[#C9822E]/30 w-full rounded-xs"></div>
                                </div>
                              )}
                              {selectedStyle === 'idcard' && (
                                <div className="absolute inset-0 bg-white flex flex-col justify-between border-t-2 border-[#1B2A4A]">
                                  <div className="bg-[#1B2A4A] text-white text-[5px] font-mono text-center py-0.5 tracking-wider uppercase">
                                    ID CARD
                                  </div>
                                  <div className="flex px-1.5 py-0.5 items-center gap-1 grow">
                                    <div className="w-6 h-6 bg-zinc-100 border border-zinc-200 flex items-center justify-center rounded-xs shrink-0">
                                      <span className="text-[8px]">👤</span>
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                      <div className="h-1 bg-zinc-300 w-8"></div>
                                      <div className="h-0.5 bg-zinc-200 w-6"></div>
                                    </div>
                                  </div>
                                  <div className="px-1.5 pb-0.5">
                                    <div className="h-0.5 bg-zinc-300 w-full"></div>
                                  </div>
                                </div>
                              )}
                              {selectedStyle === 'birthday' && (
                                <div className="absolute inset-0 bg-pink-950/20 flex flex-col justify-between p-1">
                                  <div className="flex justify-between">
                                    <span className="text-[6px]">🎈</span>
                                    <span className="text-[6px]">🎈</span>
                                  </div>
                                  <div className="flex flex-col items-center grow justify-center">
                                    <span className="text-[6px] font-bold text-pink-500 font-display uppercase tracking-widest leading-none">BDAY</span>
                                    <span className="text-[6px] mt-0.5">🎂</span>
                                  </div>
                                  <div className="flex justify-center text-[4px] text-zinc-400">
                                    <span>★ CELEBRATE</span>
                                  </div>
                                </div>
                              )}
                              {selectedStyle === 'linkedin' && (
                                <div className="absolute inset-0 bg-slate-900 flex flex-col justify-between p-1">
                                  <div className="flex items-center gap-1.5 grow">
                                    <div className="w-6 h-6 rounded-full border border-[#C9822E] bg-slate-800 flex items-center justify-center shrink-0">
                                      <span className="text-[7px]">💼</span>
                                    </div>
                                    <div className="space-y-0.5 flex-1">
                                      <div className="h-1 bg-slate-700 w-10 rounded"></div>
                                      <div className="h-0.5 bg-slate-800 w-6 rounded"></div>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center text-[4px] font-mono text-zinc-400">
                                    <span>16:9 BANNER</span>
                                    <span className="text-[#C9822E]">★ CONNECT</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Description Text */}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1 py-0.5 bg-[#1B2A4A] text-white text-[8px] font-mono uppercase font-bold tracking-wider">
                                  {TEMPLATES.find(t => t.id === selectedStyle)?.badge} PREVIEW
                                </span>
                                <span className="text-[10px] font-bold text-[#1B2A4A] uppercase tracking-wide">
                                  {TEMPLATES.find(t => t.id === selectedStyle)?.label}
                                </span>
                              </div>
                              <p className="text-[9px] text-zinc-600 leading-normal uppercase font-mono">
                                {TEMPLATES.find(t => t.id === selectedStyle)?.longDesc}
                              </p>
                              <div className="text-[8px] text-zinc-400 font-mono uppercase mt-0.5 line-clamp-1">
                                BASE: "{TEMPLATES.find(t => t.id === selectedStyle)?.samplePrompt}"
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Professional ID Card Gentle Face Warning Note */}
                        {selectedStyle === 'idcard' && selectedFile && (
                          <div className="p-3 bg-amber-50/70 border border-amber-200/60 text-amber-800 text-[10px] font-mono uppercase tracking-wide space-y-1">
                            <div className="flex items-start gap-1.5">
                              <span className="font-bold">⚠️ NOTICE:</span>
                              <span>This template works best with a face photo. You can still proceed if you wish!</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Step 3: Overlay Details */}
                      <div className="space-y-4">
                        <label className="block text-xs font-mono uppercase tracking-wider text-[#1B2A4A] font-bold">
                          [SECTION_03] TEXT OVERLAY CUSTOMIZATION <span className="text-[9px] text-zinc-400 font-normal lowercase">(optional)</span>
                        </label>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                              Full Name / Header Label
                            </label>
                            <input 
                              type="text"
                              placeholder="e.g., ALEX JOHNSON"
                              value={nameInput}
                              onChange={(e) => setNameInput(e.target.value)}
                              className="w-full text-xs px-3.5 py-2.5 rounded-none bg-[#FAFAF8] border border-[#E4E1D8] text-[#1A1918] placeholder-zinc-400 focus:outline-none focus:border-[#1B2A4A] font-mono transition-colors uppercase"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                              Title / Caption Banner
                            </label>
                            <input 
                              type="text"
                              placeholder="e.g., CREATIVE ASSOCIATE"
                              value={captionInput}
                              onChange={(e) => setCaptionInput(e.target.value)}
                              className="w-full text-xs px-3.5 py-2.5 rounded-none bg-[#FAFAF8] border border-[#E4E1D8] text-[#1A1918] placeholder-zinc-400 focus:outline-none focus:border-[#1B2A4A] font-mono transition-colors uppercase"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Generation Error */}
                      {generationError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 font-mono flex flex-col gap-2">
                          <div className="flex gap-2 items-start">
                            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                            <p className="font-bold">{generationError}</p>
                          </div>
                          {(generationError.toLowerCase().includes('demand') || generationError.toLowerCase().includes('quota') || generationError.toLowerCase().includes('rate')) && (
                            <div className="mt-1.5 pl-6 border-t border-rose-100 pt-1.5 text-[11px] text-rose-600/90 leading-relaxed space-y-1">
                              <p>
                                ⚠️ <strong>Note:</strong> Image-to-image templates are generated using the <code className="bg-rose-100/50 px-1 py-0.5 rounded">gemini-2.5-flash-image</code> model.
                              </p>
                              <p>
                                This model requires an API key with billing enabled. Please make sure you have upgraded to a paid plan in Google AI Studio or configured a billing-enabled key in the Settings menu.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Submit Action Button */}
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating || !selectedFile || !selectedStyle}
                        className={`w-full py-3.5 text-xs font-bold font-mono uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                          (isGenerating || !selectedFile || !selectedStyle)
                            ? isGenerating 
                              ? 'bg-[#C9822E]/30 text-white cursor-wait' 
                              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-[#E4E1D8]'
                            : 'bg-[#C9822E] hover:bg-[#b06f23] text-white cursor-pointer'
                        }`}
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            DEVELOPING EXPOSURES...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            GENERATE {TEMPLATES.find(t => t.id === selectedStyle)?.label.toUpperCase() || 'TEMPLATE'} ({photoMode === 'face' ? 'FACE PHOTO' : 'OBJECT PHOTO'})
                          </>
                        )}
                      </button>

                    </div>
                  </div>

                  {/* Right Side Outputs */}
                  <div className="lg:col-span-7">
                    <div className="border border-[#E4E1D8] p-5 sm:p-6 min-h-[580px] flex flex-col justify-between relative bg-white">
                      
                      <div className="border-b border-[#E4E1D8] pb-4 mb-5 flex justify-between items-center">
                        <div>
                          <h2 className="text-lg font-bold font-display uppercase tracking-wider text-[#1B2A4A]">EXPOSURE PREVIEW</h2>
                          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">VIEW & DISCHARGE DEVELOPED NEGATIVES</p>
                        </div>
                        {variations.length > 0 && (
                          <div className="flex items-center gap-1 bg-[#FAFAF8] border border-[#E4E1D8] p-1 font-mono">
                            {variations.map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setActiveVariationIdx(idx)}
                                className={`text-[10px] px-3 py-1.5 uppercase transition-all tracking-wide font-bold ${
                                  activeVariationIdx === idx 
                                    ? 'bg-[#1B2A4A] text-white' 
                                    : 'text-zinc-500 hover:text-[#1B2A4A] hover:bg-[#E4E1D8]/40'
                                }`}
                              >
                                NEG_{idx + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Display Area */}
                      <div className="flex-grow flex items-center justify-center py-6">
                        <AnimatePresence mode="wait">
                          {isGenerating ? (
                            /* Loader */
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col items-center justify-center text-center space-y-4 font-mono"
                            >
                              <div className="relative flex items-center justify-center">
                                <div className="h-14 w-14 border-2 border-[#C9822E]/30 border-t-[#C9822E] animate-spin rounded-none"></div>
                                <Sparkles className="absolute h-5 w-5 text-[#C9822E] animate-pulse" />
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs font-bold uppercase text-[#1B2A4A] tracking-widest">DEVELOPING CHEMICAL EMULSION...</p>
                                <p className="text-[10px] uppercase text-zinc-500 max-w-sm leading-relaxed">
                                  Placing custom overlays, framing graphic borders, and stabilizing portrait exposures inside the print-bath.
                                </p>
                              </div>
                            </motion.div>
                          ) : variations.length > 0 ? (
                            /* Graphics Result */
                            <motion.div 
                              key={activeVariationIdx}
                              initial={{ opacity: 0, scale: 0.99 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="w-full flex flex-col items-center gap-5"
                            >
                              <div className="relative p-3 bg-[#FAFAF8] border border-[#E4E1D8] max-w-md w-full">
                                <CornerMarks />
                                <div className="bg-white border border-[#E4E1D8] overflow-hidden relative">
                                  <img 
                                    src={variations[activeVariationIdx]} 
                                    alt="Developed Print" 
                                    className="w-full h-auto object-contain max-h-[420px] mx-auto block"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col gap-2.5 w-full max-w-md font-mono text-xs">
                                <div className="flex items-center gap-3 w-full">
                                  <button
                                    onClick={() => handleDownload(variations[activeVariationIdx])}
                                    className="flex-1 bg-[#C9822E] hover:bg-[#b06f23] text-white py-3 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    <Download className="h-4 w-4" /> DOWNLOAD PRINT
                                  </button>
                                  <button
                                    onClick={() => handleDownload(variations[activeVariationIdx], { highRes: true })}
                                    className="flex-1 bg-[#1B2A4A] hover:bg-[#121c33] text-white py-3 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    <BadgeCheck className="h-4 w-4 text-[#C9822E]" /> EXPORT HI-RES RAW
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleExportPDF(variations[activeVariationIdx])}
                                  disabled={isExportingPDF}
                                  className="w-full bg-[#8B2E2E] hover:bg-[#722222] disabled:bg-[#8B2E2E]/50 text-white py-3 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  {isExportingPDF ? (
                                    <>
                                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                      EXPORTING PDF...
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="h-4 w-4 text-[#C9822E]" /> EXPORT HIGH-QUALITY PDF
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleCopyToClipboard(variations[activeVariationIdx])}
                                  className="w-full border border-[#1B2A4A] hover:bg-[#1B2A4A]/5 text-[#1B2A4A] py-2.5 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  {copySuccess ? (
                                    <>
                                      <Check className="h-4 w-4 text-[#C9822E]" />
                                      <span className="text-[#C9822E]">COPIED</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-4 w-4" /> COPY RAW BASE64
                                    </>
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            /* Empty State proofing sheet */
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="w-full space-y-6"
                            >
                              <div className="text-center space-y-1.5 font-mono">
                                <p className="text-sm font-bold uppercase tracking-widest text-[#1B2A4A]">CONTACT PROOF SHEET</p>
                                <p className="text-[10px] uppercase text-zinc-500 max-w-md mx-auto leading-relaxed">
                                  Upload a face photo and pick your template frame on the left. The print generator will interpolate coordinates and output high-fidelity prints.
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4 font-mono">
                                {TEMPLATES.map((tpl) => (
                                  <div key={tpl.id} className="border border-[#E4E1D8] bg-[#FAFAF8] p-3.5 space-y-2 relative">
                                    <div className="h-20 w-full bg-white border border-[#E4E1D8] flex flex-col items-center justify-center relative p-1 text-center">
                                      <p className="text-[10px] font-bold text-[#1B2A4A] uppercase font-display">{tpl.label}</p>
                                    </div>
                                    <p className="text-[9px] text-zinc-500 uppercase leading-snug text-center">{tpl.description}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Footer Info */}
                      <div className="border-t border-[#E4E1D8] pt-3 text-center font-mono text-[9px] text-zinc-400">
                        ⚡ SYSTEM PATH: GEMINI-EXPOSURE-ENGINE ACTIVE
                      </div>

                    </div>
                  </div>

                </motion.div>
              ) : (
                /* EXPOSED NEGATIVES ARCHIVE VIEW */
                <motion.div 
                  key="archive"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="border border-[#E4E1D8] p-6 bg-white relative min-h-[580px]"
                >
                  <div className="flex items-center justify-between border-b border-[#E4E1D8] pb-4 mb-6 font-mono">
                    <div>
                      <h2 className="text-lg font-bold font-display uppercase tracking-wider text-[#1B2A4A] flex items-center gap-2">
                        <History className="h-4 w-4 text-[#C9822E]" />
                        EXPOSED PRINT NEGATIVE ARCHIVE
                      </h2>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">HISTORIC PRINTS PRESERVED IN SECURE EMULSION.</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowHistoryTab(false);
                        setIsBatchMode(false);
                        setSelectedArchiveIds([]);
                      }}
                      className="text-zinc-500 hover:text-[#C9822E] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      [ Return to Workspace ]
                    </button>
                  </div>

                  {userHistory.length === 0 ? (
                    <div className="text-center py-24 text-zinc-400 font-mono space-y-2">
                      <FileImage className="h-10 w-10 mx-auto opacity-30" />
                      <p className="text-sm uppercase font-bold tracking-wider">NO PRESERVED EXPOSURES FOUND.</p>
                      <p className="text-[10px] uppercase">Any custom designs you complete while logged in will automatically store here.</p>
                    </div>
                  ) : (
                    (() => {
                      const filtered = userHistory
                        .filter((item) => {
                          const queryStr = archiveSearchQuery.toLowerCase().trim();
                          const matchesQuery = !queryStr || 
                            (item.name || '').toLowerCase().includes(queryStr) ||
                            (item.caption || '').toLowerCase().includes(queryStr) ||
                            (item.templateStyle || '').toLowerCase().includes(queryStr);

                          const matchesStyle = archiveStyleFilter === 'all' || item.templateStyle === archiveStyleFilter;

                          return matchesQuery && matchesStyle;
                        })
                        .sort((a, b) => {
                          return archiveDateSort === 'desc' 
                            ? b.createdAt - a.createdAt 
                            : a.createdAt - b.createdAt;
                        });

                      return (
                        <>
                          {/* Search and Filters Segment */}
                          <div className="bg-[#FAFAF8] border border-[#E4E1D8] p-4 mb-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center font-mono text-xs">
                            {/* Search Input */}
                            <div className="md:col-span-5 relative">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#1B2A4A]/50 pointer-events-none">
                                <Search className="h-3.5 w-3.5" />
                              </span>
                              <input
                                type="text"
                                value={archiveSearchQuery}
                                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                                placeholder="SEARCH BY PORTRAIT NAME, CAPTION, OR STYLE..."
                                className="w-full pl-9 pr-8 py-2.5 rounded-none bg-white border border-[#E4E1D8] text-[#1A1918] placeholder-zinc-400 focus:outline-none focus:border-[#1B2A4A] uppercase text-xs"
                              />
                              {archiveSearchQuery && (
                                <button
                                  onClick={() => setArchiveSearchQuery('')}
                                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-[#1B2A4A]"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Template Style filter */}
                            <div className="md:col-span-4 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-[#1B2A4A] uppercase shrink-0">STYLE:</span>
                              <select
                                value={archiveStyleFilter}
                                onChange={(e) => setArchiveStyleFilter(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-none bg-white border border-[#E4E1D8] text-[#1A1918] focus:outline-none focus:border-[#1B2A4A] uppercase text-xs"
                              >
                                <option value="all">ALL STYLES</option>
                                {TEMPLATES.map((tpl) => (
                                  <option key={tpl.id} value={tpl.id}>{tpl.badge} - {tpl.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Date sort option */}
                            <div className="md:col-span-3 flex items-center gap-2">
                              <span className="text-[10px] font-bold text-[#1B2A4A] uppercase shrink-0">SORT BY DATE:</span>
                              <select
                                value={archiveDateSort}
                                onChange={(e) => setArchiveDateSort(e.target.value as 'desc' | 'asc')}
                                className="w-full px-3 py-2.5 rounded-none bg-white border border-[#E4E1D8] text-[#1A1918] focus:outline-none focus:border-[#1B2A4A] uppercase text-xs"
                              >
                                <option value="desc">NEWEST FIRST</option>
                                <option value="asc">OLDEST FIRST</option>
                              </select>
                            </div>
                          </div>

                          {/* Active filters state bar */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1B2A4A]/5 border-x border-b border-[#E4E1D8] p-3 mb-6 font-mono text-[10px] -mt-4">
                            <div className="flex items-center gap-2 text-zinc-600">
                              <span className="font-bold text-[#1B2A4A]">RESULTS:</span>
                              <span>SHOWING {filtered.length} OF {userHistory.length} PRESERVED PRINTS</span>
                              {(archiveSearchQuery !== '' || archiveStyleFilter !== 'all') && (
                                <span className="bg-[#C9822E]/10 text-[#C9822E] px-2 py-0.5 border border-[#C9822E]/25 uppercase font-bold text-[9px]">FILTERS ACTIVE</span>
                              )}
                            </div>
                            {(archiveSearchQuery !== '' || archiveStyleFilter !== 'all') && (
                              <button
                                onClick={() => {
                                  setArchiveSearchQuery('');
                                  setArchiveStyleFilter('all');
                                }}
                                className="text-[#C9822E] hover:text-[#b06f23] font-bold uppercase tracking-wider underline flex items-center gap-1 text-[9px]"
                              >
                                <X className="h-3 w-3 inline" /> CLEAR FILTERS
                              </button>
                            )}
                          </div>

                          {/* Batch Mode Control Panel */}
                          <div className={`border p-4 mb-6 font-mono transition-all duration-300 ${isBatchMode ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]' : 'bg-[#FAFAF8] border-[#E4E1D8] text-[#1A1918]'}`}>
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <FolderArchive className={`h-5 w-5 shrink-0 ${isBatchMode ? 'text-[#C9822E]' : 'text-[#1B2A4A]/60'}`} />
                                <div className="text-left">
                                  <span className="text-xs font-bold uppercase tracking-widest block">
                                    {isBatchMode ? 'BATCH DARKROOM PROCESSOR ACTIVE' : 'BATCH DOWNLOAD PORT'}
                                  </span>
                                  <span className="text-[10px] opacity-75 uppercase">
                                    {isBatchMode 
                                      ? `Selected ${selectedArchiveIds.length} print(s) to package as a ZIP archive.` 
                                      : 'Select and compile multiple prints into a unified ZIP archive.'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 sm:self-end">
                                {isBatchMode ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        const visibleIds = filtered.map(item => item.id);
                                        setSelectedArchiveIds(prev => {
                                          const combined = Array.from(new Set([...prev, ...visibleIds]));
                                          return combined;
                                        });
                                      }}
                                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                    >
                                      SELECT ALL FILTERED
                                    </button>
                                    <button
                                      onClick={() => setSelectedArchiveIds([])}
                                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                    >
                                      DESELECT ALL
                                    </button>
                                    <button
                                      disabled={selectedArchiveIds.length === 0 || isPackagingZip}
                                      onClick={handleBatchDownload}
                                      className="px-4 py-1.5 bg-[#C9822E] hover:bg-[#b06f23] disabled:opacity-50 disabled:hover:bg-[#C9822E] text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                    >
                                      {isPackagingZip ? (
                                        <>
                                          <RefreshCw className="h-3 w-3 animate-spin" />
                                          PACKAGING ({zipProgress}%)
                                        </>
                                      ) : (
                                        <>
                                          <Download className="h-3 w-3" />
                                          DOWNLOAD ZIP ({selectedArchiveIds.length})
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setIsBatchMode(false);
                                        setSelectedArchiveIds([]);
                                      }}
                                      className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-red-200 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                    >
                                      CANCEL
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setIsBatchMode(true)}
                                    className="px-4 py-2 bg-[#1B2A4A] text-white hover:bg-[#1B2A4A]/90 border border-[#1B2A4A]/20 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 cursor-pointer"
                                  >
                                    <FolderArchive className="h-3.5 w-3.5 text-[#C9822E]" />
                                    ENABLE BATCH SELECTION
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {filtered.length === 0 ? (
                            <div className="text-center py-20 text-zinc-400 font-mono space-y-2">
                              <FileImage className="h-10 w-10 mx-auto opacity-30" />
                              <p className="text-sm uppercase font-bold tracking-wider">NO MATCHING EXPOSURES FOUND.</p>
                              <p className="text-[10px] uppercase">Try adjusting your filters or search terms above.</p>
                              <button
                                onClick={() => {
                                  setArchiveSearchQuery('');
                                  setArchiveStyleFilter('all');
                                }}
                                className="mt-4 px-4 py-2 bg-[#C9822E] text-white hover:bg-[#b06f23] text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                              >
                                RESET FILTERS
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 font-mono">
                              {filtered.map((item) => {
                                const isSelected = selectedArchiveIds.includes(item.id);
                                return (
                                  <div 
                                    key={item.id}
                                    className={`bg-[#FAFAF8] border p-3.5 space-y-3 cursor-pointer group transition-all relative ${
                                      isSelected 
                                        ? 'border-[#C9822E] bg-[#C9822E]/5 ring-2 ring-[#C9822E]/25 shadow-md' 
                                        : 'border-[#E4E1D8] hover:border-[#C9822E]/40'
                                    }`}
                                    onClick={() => {
                                      if (isBatchMode) {
                                        setSelectedArchiveIds(prev => {
                                          if (prev.includes(item.id)) {
                                            return prev.filter(id => id !== item.id);
                                          } else {
                                            return [...prev, item.id];
                                          }
                                        });
                                      } else {
                                        setVariations([item.imageUrl]);
                                        setActiveVariationIdx(0);
                                        setSelectedStyle(item.templateStyle);
                                        setNameInput(item.name || '');
                                        setCaptionInput(item.caption || '');
                                        setShowHistoryTab(false);
                                      }
                                    }}
                                  >
                                    <CornerMarks />
                                    
                                    {/* Selection Checkbox Overlay */}
                                    {isBatchMode && (
                                      <div className="absolute top-2.5 right-2.5 z-10 bg-white border border-[#E4E1D8] p-1 shadow-sm transition-all rounded-none">
                                        {isSelected ? (
                                          <CheckSquare className="h-4 w-4 text-[#C9822E]" />
                                        ) : (
                                          <Square className="h-4 w-4 text-zinc-400" />
                                        )}
                                      </div>
                                    )}

                                    <div className="relative aspect-square bg-white border border-[#E4E1D8] overflow-hidden">
                                      <img 
                                        src={item.imageUrl} 
                                        alt="Exposed negative archive" 
                                        className="w-full h-full object-cover filter contrast-105"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-[9px] text-zinc-500">
                                        <span className="font-bold text-[#C9822E] uppercase tracking-wider">{item.templateStyle}</span>
                                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      <p className="text-xs font-bold text-[#1B2A4A] uppercase tracking-wide truncate">{item.name || 'UNTITLED'}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </main>
        </div>
      )}

      {/* ==================== 5. ADMIN VIEW ==================== */}
      {currentScreen === 'admin' && (
        <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans text-[#1A1918]">
          {/* Header */}
          <header className="bg-[#1B2A4A] text-white border-b border-[#E4E1D8] px-4 sm:px-6 lg:px-8 py-4 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[#C9822E]" />
              <div>
                <h1 className="text-base sm:text-lg font-display font-bold uppercase tracking-wider">PIXCRAFT LAB ADMIN</h1>
                <p className="text-[9px] font-mono uppercase text-white/50 tracking-widest">REAL-TIME TELEMETRY ENGINE // CONFLICTS OVERRULED</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setCurrentScreen('dashboard');
                  window.history.pushState({}, '', '/');
                }}
                className="bg-[#C9822E] hover:bg-[#b06f23] text-white font-mono font-bold uppercase tracking-wider px-4 py-2.5 text-xs transition-colors rounded-none cursor-pointer"
              >
                RETURN TO WORKSPACE
              </button>
              
              <button
                onClick={handleLogout}
                className="border border-white/20 hover:bg-white/5 text-white font-mono font-bold uppercase tracking-wider px-3 py-2.5 text-xs transition-colors rounded-none cursor-pointer"
              >
                LOG OUT
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 overflow-y-auto">
            {isAdminLoading ? (
              <div className="text-center py-24 font-mono text-xs text-zinc-500 space-y-3">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-[#C9822E]" />
                <p className="uppercase tracking-widest">LOADING SECURED CLOUD DOCUMENTS...</p>
              </div>
            ) : (
              <>
                {/* Bento Grid Stats Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Users */}
                  <div className="bg-white border border-[#E4E1D8] p-6 relative overflow-hidden flex flex-col justify-between">
                    <CornerMarks />
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">DATABASE SIZE</span>
                      <h4 className="text-sm font-bold text-[#1B2A4A] uppercase tracking-wider font-mono">TOTAL CREATOR ACCOUNTS</h4>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-[#1B2A4A] tracking-tight">{calculatedStats.totalUsers}</span>
                      <span className="text-[10px] font-mono text-[#C9822E] uppercase">REGISTERED OPERATORS</span>
                    </div>
                    <div className="mt-4 border-t border-dashed border-[#E4E1D8] pt-3 text-[9px] font-mono text-zinc-500 uppercase">
                      ● ALL SECURITY CRITERIA COMPLIANT
                    </div>
                  </div>

                  {/* Total Generations */}
                  <div className="bg-white border border-[#E4E1D8] p-6 relative overflow-hidden flex flex-col justify-between">
                    <CornerMarks />
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">EMULSION ACTIVITY</span>
                      <h4 className="text-sm font-bold text-[#1B2A4A] uppercase tracking-wider font-mono">TOTAL COMPLETED GENERATIONS</h4>
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-[#C9822E] tracking-tight">{calculatedStats.totalGenerations}</span>
                      <span className="text-[10px] font-mono text-[#1B2A4A] uppercase">ATTEMPTS LOGGED</span>
                    </div>
                    <div className="mt-4 border-t border-dashed border-[#E4E1D8] pt-3 text-[9px] font-mono text-zinc-500 uppercase">
                      ● REAL-TIME METRIC STREAM AGGREGATED
                    </div>
                  </div>

                  {/* Most Popular Template */}
                  <div className="bg-white border border-[#E4E1D8] p-6 relative overflow-hidden flex flex-col justify-between">
                    <CornerMarks />
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">LAB PREFERENCE</span>
                      <h4 className="text-sm font-bold text-[#1B2A4A] uppercase tracking-wider font-mono">MOST POPULAR STYLE</h4>
                    </div>
                    <div className="mt-4">
                      <p className="text-xl font-bold text-[#1B2A4A] uppercase tracking-wide truncate">{calculatedStats.mostPopular.split(' (')[0]}</p>
                      <p className="text-xs font-mono text-zinc-500 uppercase mt-1">
                        {calculatedStats.mostPopular.includes('(') ? calculatedStats.mostPopular.slice(calculatedStats.mostPopular.indexOf('(')) : ''}
                      </p>
                    </div>
                    <div className="mt-4 border-t border-dashed border-[#E4E1D8] pt-3 text-[9px] font-mono text-zinc-500 uppercase">
                      ● DYNAMIC DEMAND OPTIMIZATION ENGAGED
                    </div>
                  </div>
                </div>

                {/* Filter and Table Container */}
                <div className="bg-white border border-[#E4E1D8] p-6 relative">
                  <CornerMarks />
                  
                  {/* Table Header with Title */}
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-[#E4E1D8] pb-6 mb-6 gap-4">
                    <div>
                      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#C9822E]">LAB EXPOSURE JOURNAL</h3>
                      <h2 className="text-xl font-display font-bold uppercase tracking-wide text-[#1B2A4A] mt-1">RECENT USER ACTIVITY LOGS</h2>
                    </div>
                    
                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center gap-3 font-mono text-[10px]">
                      {/* Search Bar */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="SEARCH OPERATOR EMAIL/ID..."
                          value={adminSearch}
                          onChange={(e) => setAdminSearch(e.target.value)}
                          className="px-3 py-2 pl-8 border border-[#E4E1D8] focus:outline-none focus:border-[#1B2A4A] bg-[#FAFAF8] text-xs w-48 sm:w-64 uppercase text-[10px] rounded-none"
                        />
                        <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                        {adminSearch && (
                          <button
                            onClick={() => setAdminSearch('')}
                            className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 font-bold"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Status select */}
                      <select
                        value={adminStatusFilter}
                        onChange={(e: any) => setAdminStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-[#E4E1D8] focus:outline-none focus:border-[#1B2A4A] bg-[#FAFAF8] text-[10px] rounded-none uppercase"
                      >
                        <option value="all">ALL STATUSES</option>
                        <option value="success">SUCCESS ONLY</option>
                        <option value="pending">PENDING ONLY</option>
                        <option value="failed">FAILED ONLY</option>
                      </select>

                      {/* Template select */}
                      <select
                        value={adminTemplateFilter}
                        onChange={(e: any) => setAdminTemplateFilter(e.target.value)}
                        className="px-3 py-2 border border-[#E4E1D8] focus:outline-none focus:border-[#1B2A4A] bg-[#FAFAF8] text-[10px] rounded-none uppercase"
                      >
                        <option value="all">ALL TEMPLATES</option>
                        {TEMPLATES.map(tpl => (
                          <option key={tpl.id} value={tpl.id}>{tpl.label.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Activity Table */}
                  <div className="overflow-x-auto">
                    {filteredActivity.length === 0 ? (
                      <div className="text-center py-16 text-zinc-400 font-mono text-[11px] uppercase">
                        NO LOGGED ACTIVITY MATCHES THIS SUB-CRITERIA.
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-[#E4E1D8] font-mono text-[11px]">
                        <thead>
                          <tr className="text-left text-zinc-400 uppercase tracking-widest text-[9px] font-bold">
                            <th className="pb-3 pr-4">OPERATOR (UID/EMAIL)</th>
                            <th className="pb-3 px-4">TEMPLATE STYLE</th>
                            <th className="pb-3 px-4">TIMESTAMP</th>
                            <th className="pb-3 px-4">STATUS</th>
                            <th className="pb-3 pl-4 text-right">PREVIEW</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#FAFAF8]">
                          {filteredActivity.map((gen) => {
                            const userDetails = userLookup[gen.userId] || { name: 'Guest', email: 'Anonymous/Guest' };
                            const timestampStr = gen.timestamp 
                              ? (gen.timestamp.toDate ? gen.timestamp.toDate().toLocaleString() : new Date(gen.createdAt || gen.timestamp).toLocaleString()) 
                              : 'PENDING';
                            
                            const templateObj = TEMPLATES.find(t => t.id === (gen.templateType || gen.templateStyle));
                            const templateLabel = templateObj ? templateObj.label : (gen.templateType || gen.templateStyle || 'UNKNOWN').toUpperCase();

                            return (
                              <tr key={gen.id} className="hover:bg-[#FAFAF8]/50 transition-colors">
                                <td className="py-3.5 pr-4 max-w-xs truncate">
                                  <div className="font-bold text-[#1B2A4A] truncate uppercase">{userDetails.name}</div>
                                  <div className="text-[9px] text-zinc-500 truncate lowercase">{userDetails.email}</div>
                                  <div className="text-[8px] text-zinc-400 truncate tracking-tighter">UID: {gen.userId}</div>
                                </td>
                                
                                <td className="py-3.5 px-4 font-bold text-[#1B2A4A] uppercase">
                                  <div>{templateLabel}</div>
                                  <div className="text-[8px] font-mono font-normal text-zinc-500 lowercase mt-0.5">
                                    mode: {gen.photoMode || 'face'}
                                  </div>
                                </td>
                                
                                <td className="py-3.5 px-4 text-zinc-500 text-[10px]">
                                  {timestampStr}
                                </td>
                                
                                <td className="py-3.5 px-4">
                                  {gen.status === 'success' && (
                                    <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 uppercase font-bold">
                                      <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                      SUCCESS
                                    </span>
                                  )}
                                  {gen.status === 'pending' && (
                                    <span className="inline-flex items-center gap-1 text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 uppercase font-bold animate-pulse">
                                      <RefreshCw className="h-2.5 w-2.5 text-amber-600 animate-spin shrink-0" />
                                      PENDING
                                    </span>
                                  )}
                                  {gen.status === 'failed' && (
                                    <span className="inline-flex items-center gap-1 text-[9px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 uppercase font-bold" title={gen.errorType}>
                                      <ShieldAlert className="h-3 w-3 text-rose-600 shrink-0" />
                                      FAILED ({gen.errorType || 'UNKNOWN'})
                                    </span>
                                  )}
                                </td>
                                
                                <td className="py-3.5 pl-4 text-right">
                                  {gen.status === 'success' && gen.imageUrl ? (
                                    <div className="inline-flex justify-end relative group">
                                      <img
                                        src={gen.imageUrl}
                                        alt="Thumbnail"
                                        className="h-8 w-8 object-cover border border-[#E4E1D8] group-hover:scale-110 transition-transform cursor-pointer"
                                        onClick={() => {
                                          setVariations([gen.imageUrl]);
                                          setActiveVariationIdx(0);
                                          setSelectedStyle(gen.templateStyle || gen.templateType);
                                          setNameInput(gen.name || '');
                                          setCaptionInput(gen.caption || '');
                                          setCurrentScreen('dashboard');
                                          setShowHistoryTab(false);
                                        }}
                                        title="Click to load in workspace"
                                      />
                                      {/* Expanded Hover Overlay Preview */}
                                      <div className="absolute right-10 bottom-0 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-[#E4E1D8] bg-white p-2 shadow-2xl w-44">
                                        <div className="relative aspect-[3/4]">
                                          <img src={gen.imageUrl} className="w-full h-full object-cover" />
                                        </div>
                                        <p className="text-[8px] font-mono uppercase text-center mt-1 truncate text-zinc-500">{gen.name || 'EXPOSURE'}</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-400">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      )}

    </div>
  );
}
