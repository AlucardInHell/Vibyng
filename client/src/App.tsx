import { Switch, Route } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Artists from "@/pages/artists";
import ArtistProfile from "@/pages/artist-profile";
import ContentPage from "@/pages/content";
import Points from "@/pages/points";
import Messages from "@/pages/messages";
import Chat from "@/pages/chat";
import SearchPage from "@/pages/search";
import { AudioPlayerProvider, MiniPlayer, CompactMiniPlayer, useAudioPlayer } from "@/components/audio-player";
import AuthPage from "@/pages/auth";
import Onboarding from "@/pages/onboarding";
import Notifications from "@/pages/notifications";
import VPoints from "@/pages/vpoints";
import ResetPassword from "@/pages/reset-password";
import { useState, createContext, useContext, useEffect, useRef, useCallback } from "react";
import type { User as UserType } from "@shared/schema";
import { Home as HomeIcon, Users, Zap, Music, MessageCircle, Settings, User, Shield, Bell, Globe, Moon, Sun, HelpCircle, FileText, LogOut, Check, X, Plus, Camera, Video, Upload, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch as SwitchUI } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import { legalDocuments } from "@/lib/legal-documents";

type Theme = "light" | "dark";
type AppLanguage = "it" | "en";

const appTranslations = {
  it: {
    feed: "Feed",
    flow: "Flow",
    me: "Me",
    messages: "Messaggi",
    notifications: "Notifiche",

    settings: "Impostazioni",
    account: "Account",
    privacy: "Privacy",
    language: "Lingua",
    darkTheme: "Tema Scuro",
    lightTheme: "Tema Chiaro",
    help: "Assistenza",
    terms: "Termini e Condizioni",
    logout: "Esci",
    privacyPolicy: "Informativa Privacy",

    accountTitle: "Il tuo Account",
    editProfileTitle: "Modifica Profilo",
    accountDescription: "Gestisci le informazioni del tuo profilo",
    editProfileDescription: "Modifica le informazioni del tuo profilo",

    displayName: "Nome visualizzato",
    username: "Username",
    email: "Email",
    bio: "Bio",
    memberSince: "Membro dal",
    followedProfiles: "Profili seguiti",
    vibyngPoints: "VibyngPoints",

    close: "Chiudi",
    editProfile: "Modifica Profilo",
    cancel: "Annulla",
    saveChanges: "Salva Modifiche",
    saving: "Salvataggio...",
    deleteAccountTitle: "Elimina definitivamente il profilo",
deleteAccountDescription: "Questa azione è definitiva. Il tuo profilo, i contenuti e le interazioni collegate potranno essere rimossi in modo permanente.",
deleteAccountConfirmText: "Per confermare, scrivi ELIMINA",
deleteAccountInputPlaceholder: "Scrivi ELIMINA",
deleteAccountButton: "Elimina definitivamente",
deleteAccountCancel: "Annulla",
deleteAccountError: "Non è stato possibile eliminare il profilo",
deleteAccountSuccess: "Profilo eliminato",

    privacyTitle: "Privacy",
    privacyDescription: "Controlla chi può vedere le tue informazioni",
    publicProfile: "Profilo pubblico",
    publicProfileDescription: "Altri utenti possono vedere il tuo profilo",
    showActivity: "Mostra attività",
    showActivityDescription: "Mostra i tuoi like e commenti",
    allowMessages: "Consenti messaggi",
    allowMessagesDescription: "Ricevi messaggi da altri utenti",

    notificationsTitle: "Notifiche",
    notificationsDescription: "Scegli quali notifiche ricevere",
    pushNotifications: "Notifiche push",
    pushNotificationsDescription: "Ricevi notifiche sul dispositivo",
    emailNotifications: "Email",
    emailNotificationsDescription: "Ricevi aggiornamenti via email",
    notificationTypes: "Tipi di notifiche",
    newFollowers: "Nuovi follower",
    newMessages: "Nuovi messaggi",
    artistUpdates: "Aggiornamenti artisti",

    languageTitle: "Lingua",
    languageDescription: "Seleziona la lingua dell'app",
    save: "Salva",

    profileUpdated: "Profilo aggiornato",
    profileUpdatedDescription: "Le modifiche sono state salvate con successo!",
    profileUpdateError: "Non è stato possibile salvare le modifiche",
    privacyUpdated: "Privacy aggiornata",
    privacyUpdatedDescription: "Le impostazioni sono state salvate.",
    notificationsUpdated: "Notifiche aggiornate",
    notificationsUpdatedDescription: "Le preferenze sono state salvate.",
    languageUpdated: "Lingua aggiornata",
    languageUpdatedDescription: "Italiano selezionato.",

faqTitle: "Domande Frequenti",
    faqItems: [
      { q: "Come posso diventare artista su Vibyng?", a: "Durante la registrazione seleziona il ruolo 'Artista'. Potrai caricare musica, foto e video, avviare live e ricevere il supporto economico dei tuoi fan." },
      { q: "Come faccio a ricevere il supporto economico dei fan?", a: "Per ricevere pagamenti devi collegare un account Stripe al tuo profilo artista. Vai su Impostazioni → Account e segui la procedura di collegamento. Senza un account Stripe attivo non potrai incassare i contributi dei fan." },
      { q: "Cosa sono i VibyngPoints?", a: "I VibyngPoints sono punti che guadagni interagendo con la community: pubblicare contenuti, commentare, mettere like. Puoi usarli per sbloccare funzionalità esclusive e ricompense." },
      { q: "Come funziona il supporto agli artisti?", a: "Ogni artista può creare degli obiettivi economici. I fan possono contribuire liberamente tramite carta di credito. I pagamenti vengono processati da Stripe in modo sicuro." },
      { q: "Come avvio una diretta live?", a: "Dalla sezione 'Me' premi il pulsante rosso Live, configura il titolo e premi 'Avvia diretta'. La tua live sarà visibile nella sezione Flow a tutti gli utenti." },
      { q: "Come segnalo un contenuto inappropriato?", a: "Su ogni post, foto, video e commento trovi il menu (⋮) con l'opzione 'Segnala'. Il nostro team esaminerà la segnalazione entro 24 ore." },
      { q: "Posso seguire sia artisti che altri fan?", a: "Sì, puoi seguire qualsiasi profilo su Vibyng, sia artisti che fan." },
    ],    
helpTitle: "Assistenza",
paymentsTitle: "Pagamenti",
    paymentsDescription: "Gestisci il tuo account Stripe per ricevere i pagamenti",
    connectStripe: "Collega account Stripe",
    stripeConnected: "Account Stripe collegato ✅",
    stripeNotConnected: "Account Stripe non collegato",
    stripeOnboardingComplete: "Onboarding completato — puoi ricevere pagamenti",
    stripeOnboardingPending: "Completa la verifica su Stripe per ricevere pagamenti",
    openStripeDashboard: "Apri dashboard Stripe",
    stripeConnecting: "Connessione in corso...",
helpDescription: "Come possiamo aiutarti?",
faq: "Domande Frequenti (FAQ)",
faqToastTitle: "FAQ",
faqToastDescription: "Apertura FAQ...",
contactSupport: "Contatta il Supporto",
supportToastTitle: "Supporto",
supportToastDescription: "Scrivici a support@vibyng.com",
reportProblem: "Segnala un Problema",
bugToastTitle: "Bug Report",
bugToastDescription: "Grazie per la segnalazione!",

termsTitle: "Termini e Condizioni",
termsDescription: "Ultimo aggiornamento: Gennaio 2024",
understood: "Ho capito",

logoutTitle: "Conferma Logout",
logoutDescription: "Sei sicuro di voler uscire dal tuo account?",

disconnected: "Disconnesso",
disconnectedDescription: "Hai effettuato il logout con successo.",
photo: "Foto",
video: "Video",
file: "File",
uploadSelectedTitle: "File selezionato",
uploadSelectedDescription: "è stato selezionato con successo",

error: "Errore",
  },

  en: {
    feed: "Feed",
    flow: "Flow",
    me: "Me",
    messages: "Messages",
    notifications: "Notifications",

    settings: "Settings",
    account: "Account",
    privacy: "Privacy",
    language: "Language",
    darkTheme: "Dark Theme",
    lightTheme: "Light Theme",
    help: "Help",
    terms: "Terms and Conditions",
    logout: "Log out",
    privacyPolicy: "Privacy Policy",

    accountTitle: "Your Account",
    editProfileTitle: "Edit Profile",
    accountDescription: "Manage your profile information",
    editProfileDescription: "Edit your profile information",

    displayName: "Display name",
    username: "Username",
    email: "Email",
    bio: "Bio",
    memberSince: "Member since",
    followedProfiles: "Followed profiles",
    vibyngPoints: "VibyngPoints",

    close: "Close",
    editProfile: "Edit Profile",
    cancel: "Cancel",
    saveChanges: "Save Changes",
    saving: "Saving...",
    deleteAccountTitle: "Permanently delete profile",
deleteAccountDescription: "This action is permanent. Your profile, content, and related interactions may be permanently removed.",
deleteAccountConfirmText: "To confirm, type DELETE",
deleteAccountInputPlaceholder: "Type DELETE",
deleteAccountButton: "Delete permanently",
deleteAccountCancel: "Cancel",
deleteAccountError: "Unable to delete profile",
deleteAccountSuccess: "Profile deleted",

    privacyTitle: "Privacy",
    privacyDescription: "Control who can see your information",
    publicProfile: "Public profile",
    publicProfileDescription: "Other users can see your profile",
    showActivity: "Show activity",
    showActivityDescription: "Show your likes and comments",
    allowMessages: "Allow messages",
    allowMessagesDescription: "Receive messages from other users",

    notificationsTitle: "Notifications",
    notificationsDescription: "Choose which notifications you want to receive",
    pushNotifications: "Push notifications",
    pushNotificationsDescription: "Receive notifications on your device",
    emailNotifications: "Email",
    emailNotificationsDescription: "Receive updates by email",
    notificationTypes: "Notification types",
    newFollowers: "New followers",
    newMessages: "New messages",
    artistUpdates: "Artist updates",

    languageTitle: "Language",
    languageDescription: "Select the app language",
    save: "Save",

    profileUpdated: "Profile updated",
    profileUpdatedDescription: "Your changes have been saved successfully!",
    profileUpdateError: "Unable to save changes",
    privacyUpdated: "Privacy updated",
    privacyUpdatedDescription: "Your settings have been saved.",
    notificationsUpdated: "Notifications updated",
    notificationsUpdatedDescription: "Your preferences have been saved.",
    languageUpdated: "Language updated",
    languageUpdatedDescription: "English selected.",

faqTitle: "Frequently Asked Questions",
    faqItems: [
      { q: "How do I become an artist on Vibyng?", a: "During registration, select the 'Artist' role. You'll be able to upload music, photos and videos, start live streams and receive financial support from your fans." },
      { q: "How do I receive financial support from fans?", a: "To receive payments you need to connect a Stripe account to your artist profile. Go to Settings → Account and follow the connection process. Without an active Stripe account you won't be able to receive fan contributions." },
      { q: "What are VibyngPoints?", a: "VibyngPoints are points you earn by interacting with the community: publishing content, commenting, liking. You can use them to unlock exclusive features and rewards." },
      { q: "How does artist support work?", a: "Each artist can create financial goals. Fans can contribute freely via credit card. Payments are processed securely by Stripe." },
      { q: "How do I start a live stream?", a: "From the 'Me' section press the red Live button, set a title and press 'Start broadcast'. Your live will be visible in the Flow section to all users." },
      { q: "How do I report inappropriate content?", a: "On every post, photo, video and comment you'll find the menu (⋮) with a 'Report' option. Our team will review the report within 24 hours." },
      { q: "Can I follow both artists and other fans?", a: "Yes, you can follow any profile on Vibyng, both artists and fans." },
    ],    
helpTitle: "Help",
paymentsTitle: "Payments",
    paymentsDescription: "Manage your Stripe account to receive payments",
    connectStripe: "Connect Stripe account",
    stripeConnected: "Stripe account connected ✅",
    stripeNotConnected: "Stripe account not connected",
    stripeOnboardingComplete: "Onboarding complete — you can receive payments",
    stripeOnboardingPending: "Complete verification on Stripe to receive payments",
    openStripeDashboard: "Open Stripe dashboard",
    stripeConnecting: "Connecting...",
helpDescription: "How can we help you?",
faq: "Frequently Asked Questions (FAQ)",
faqToastTitle: "FAQ",
faqToastDescription: "Opening FAQ...",
contactSupport: "Contact Support",
supportToastTitle: "Support",
supportToastDescription: "Write to us at support@vibyng.com",
reportProblem: "Report a Problem",
bugToastTitle: "Bug Report",
bugToastDescription: "Thanks for your report!",

termsTitle: "Terms and Conditions",
termsDescription: "Last updated: January 2024",
understood: "Got it",

logoutTitle: "Confirm Logout",
logoutDescription: "Are you sure you want to log out of your account?",

disconnected: "Logged out",
disconnectedDescription: "You have logged out successfully.",
photo: "Photo",
video: "Video",
file: "File",
uploadSelectedTitle: "File selected",
uploadSelectedDescription: "has been selected successfully",

error: "Error",
  },
} as const;

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: "light",
  setTheme: () => {},
});

  const LanguageContext = createContext<{
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: typeof appTranslations.it;
}>({
  language: "it",
  setLanguage: () => {},
  t: appTranslations.it,
});

export type ProfileData = {
  displayName: string;
  username: string;
  email: string;
  bio: string;
  avatarUrl?: string | null;
  role?: string;
  genre?: string;
};

function getCurrentUserId(): number {
  try {
    const stored = localStorage.getItem("vibyng-user");
    if (stored) return JSON.parse(stored).id || 4;
  } catch {}
  return 4;
}
function getStoredUser() {
  try {
    const stored = localStorage.getItem("vibyng-user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export const ProfileContext = createContext<{
  profileData: ProfileData;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  isLoading: boolean;
}>({
  profileData: {
    displayName: "",
    username: "",
    email: "",
    bio: "",
    avatarUrl: null,
  },
  updateProfile: async () => {},
  isLoading: true,
});

export function useProfile() {
  return useContext(ProfileContext);
}

function ProfileProvider({ children }: { children: React.ReactNode }) {
  const storedUser = localStorage.getItem("vibyng-user");
  const userId = storedUser ? JSON.parse(storedUser).id : 0;
  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ["/api/users", userId],
    enabled: userId > 0,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      return apiRequest("PATCH", `/api/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
    },
  });

  const profileData: ProfileData = user ? {
    displayName: user.displayName || "",
    username: user.username || "",
    email: user.email || "",
    bio: user.bio || "",
    avatarUrl: user.avatarUrl,
    role: (user as any).role || "",
    genre: (user as any).genre || "",
  } : {
    displayName: "",
    username: "",
    email: "",
    bio: "",
    avatarUrl: null,
    role: "",
    genre: "",
  };

  const updateProfile = useCallback(async (data: Partial<ProfileData>) => {
    await updateMutation.mutateAsync(data);
  }, [updateMutation]);

  return (
    <ProfileContext.Provider value={{ profileData, updateProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
}

function useTheme() {
  return useContext(ThemeContext);
}

function useLanguage() {
  return useContext(LanguageContext);
}

function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("vibyng-language");
      if (stored === "it" || stored === "en") return stored;
    }
    return "it";
  });

  const setLanguage = (nextLanguage: AppLanguage) => {
  setLanguageState(nextLanguage);
  localStorage.setItem("vibyng-language", nextLanguage);
  window.dispatchEvent(
    new CustomEvent("vibyng-language-change", { detail: nextLanguage })
  );
};

  const t = appTranslations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("vibyng-theme") as Theme;

    if (stored === "light" || stored === "dark") {
      return stored;
    }
  }

  return "dark";
});

  useEffect(() => {
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(theme);

  // Evita che Chrome/Samsung Internet applichino il filtro "sito scuro"
  // sopra i colori già gestiti da Vibyng.
  root.style.colorScheme = "only light";

  localStorage.setItem("vibyng-theme", theme);
}, [theme]);
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/artists" component={Artists} />
      <Route path="/artist/:id" component={ArtistProfile} />
      <Route path="/content/:type/:id" component={ContentPage} />
      <Route path="/messages" component={Messages} />
      <Route path="/chat/:artistId" component={Chat} />
      <Route path="/me" component={Points} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/vpoints" component={VPoints} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppAudioPlayer() {
  const [location] = useLocation();
  const { isPlaying, togglePlay } = useAudioPlayer();

  const isChatRoute = location.startsWith("/chat/");
  const isFlowRoute = location.startsWith("/artists");

  useEffect(() => {
    if (isFlowRoute && isPlaying) {
      togglePlay();
    }
  }, [isFlowRoute, isPlaying, togglePlay]);

  return isChatRoute || isFlowRoute ? <CompactMiniPlayer /> : <MiniPlayer />;
}

function MessagesButton() {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();

  const storedUser = localStorage.getItem("vibyng-user");
  const userId = storedUser ? JSON.parse(storedUser).id : 0;

  const isActive = location === "/messages";

  const goToMessages = () => {
  if (location === "/messages") {
    window.location.assign("/messages");
    return;
  }

  setLocation("/messages");

    queryClient.invalidateQueries({
      queryKey: ["/api/users", userId, "conversations"],
    });

    queryClient.invalidateQueries({
      queryKey: ["/api/messages/unread", userId],
    });

    queryClient.invalidateQueries({
      queryKey: ["/api/messages/unread-per-user", userId],
    });

    setTimeout(() => {
      window.dispatchEvent(new Event("vibyng-messages-refresh"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };
  const { data: unreadCount = 0 } = useQuery<number>({
   queryKey: ["/api/messages/unread", userId],
   queryFn: async () => {
      const res = await fetch(`/api/messages/unread/${userId}?t=${Date.now()}`);
      return res.json();
    },
    refetchInterval: 5000,
    staleTime: 0,
  });

  return (
    <button
  onClick={goToMessages}
        className={`flex w-full min-w-0 flex-col items-center justify-center gap-1 px-0 py-2 rounded-md transition-colors relative ${
  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
}`}
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <span className="max-w-full truncate text-[11px] font-medium leading-none">{t.messages}</span>
      </button>
  );
}
function NotificationBell() {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();

  const storedUser = localStorage.getItem("vibyng-user");
  const userId = storedUser ? JSON.parse(storedUser).id : 0;

  const isActive = location === "/notifications";

  const goToNotifications = () => {
  if (location === "/notifications") {
    window.location.assign("/notifications");
    return;
  }

  setLocation("/notifications");

    queryClient.invalidateQueries({
      queryKey: ["/api/notifications", userId],
    });

    setTimeout(() => {
      window.dispatchEvent(new Event("vibyng-notifications-refresh"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications", userId],
    queryFn: async () => {
      const res = await fetch(`/api/notifications/${userId}`);
      return res.json();
    },
    refetchInterval: 10000,
  });
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <button
  onClick={goToNotifications}
        className={`flex w-full min-w-0 flex-col items-center justify-center gap-1 px-0 py-2 rounded-md transition-colors relative ${
  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
}`}
      >
        <div className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <span className="max-w-full truncate text-[11px] font-medium leading-none">{t.notifications}</span>
      </button>
  );
}
function BottomNav() {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const currentUserId = getCurrentUserId();
  const goToTop = (path: string) => {
  if (location !== path) {
    setLocation(path);
  }

  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 0);
};
  
  const handleFeedRefresh = () => {
  if (location === "/") {
    window.location.assign("/");
    return;
  }

  setLocation("/");

  queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
  queryClient.invalidateQueries({ queryKey: ["/api/stories"] });

  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 0);
};
  const handleFlowRefresh = () => {
  if (location.startsWith("/artists")) {
    window.location.assign("/artists");
    return;
  }

  setLocation("/artists");

  queryClient.invalidateQueries({ queryKey: ["/api/artists"] });
  queryClient.invalidateQueries({ queryKey: ["/api/flow/client"], exact: false });

  setTimeout(() => {
    window.dispatchEvent(new Event("vibyng-flow-refresh"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 0);
};
  const handleMeRefresh = () => {
  if (location.startsWith("/me")) {
    window.location.assign("/me");
    return;
  }

  setLocation("/me");

  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 0);
};
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const navItemsLeft = [
  { path: "/", icon: HomeIcon, label: t.feed },
  { path: "/artists", icon: Zap, label: t.flow },
];

  const navItemsRight = [
  { path: "/me", icon: User, label: t.me },
];

  const handleTakePhoto = () => {
    photoInputRef.current?.click();
  };

  const handleRecordVideo = () => {
    videoInputRef.current?.click();
  };

  const handleUploadMedia = () => {
    mediaInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
  const file = e.target.files?.[0];
  if (file) {
    toast({
      title: `${type} ${t.uploadSelectedTitle.toLowerCase()}`,
      description: `"${file.name}" ${t.uploadSelectedDescription}`,
    });
    e.target.value = "";
  }
};

  const renderNavItem = (item: { path: string; icon: React.ComponentType<{ className?: string }>; label: string }) => {
  const isActive = location === item.path || (item.path !== "/" && item.path !== "/me" && location.startsWith(item.path));

  if (item.path === "/") {
    return (
      <button
        key={item.path}
        onClick={handleFeedRefresh}
        className={`flex w-full min-w-0 flex-col items-center justify-center gap-1 px-0 py-2 rounded-md transition-colors ${
  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
}`}
        data-testid={`nav-${item.label.toLowerCase()}`}
      >
        <item.icon className="w-5 h-5" />
        <span className="max-w-full truncate text-[11px] font-medium leading-none">{item.label}</span>
      </button>
    );
  }

if (item.path === "/artists") {
  return (
    <button
      key={item.path}
      onClick={handleFlowRefresh}
      className={`flex w-full min-w-0 flex-col items-center justify-center gap-1 px-0 py-2 rounded-md transition-colors ${
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
      data-testid={`nav-${item.label.toLowerCase()}`}
    >
      <item.icon className="w-5 h-5" />
      <span className="max-w-full truncate text-[11px] font-medium leading-none">{item.label}</span>
    </button>
  );
}
    
if (item.path === "/me") {
  return (
    <button
      key={item.path}
      onClick={handleMeRefresh}
      className={`flex w-full min-w-0 flex-col items-center justify-center gap-1 px-0 py-2 rounded-md transition-colors ${
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
      data-testid={`nav-${item.label.toLowerCase()}`}
    >
      <item.icon className="w-5 h-5" />
      <span className="max-w-full truncate text-[11px] font-medium leading-none">{item.label}</span>
    </button>
  );
}
    
  return (
    <Link key={item.path} href={item.path}>
      <button
        className={`flex w-full min-w-0 flex-col items-center justify-center gap-1 px-0 py-2 rounded-md transition-colors ${
  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
}`}
        data-testid={`nav-${item.label.toLowerCase()}`}
      >
        <item.icon className="w-5 h-5" />
        <span className="max-w-full truncate text-[11px] font-medium leading-none">{item.label}</span>
      </button>
    </Link>
  );
};
  return (
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelected(e, t.photo)}
        className="hidden"
        data-testid="input-photo-capture"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={(e) => handleFileSelected(e, t.video)}
        className="hidden"
        data-testid="input-video-capture"
      />
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        onChange={(e) => handleFileSelected(e, t.file)}
        className="hidden"
        data-testid="input-media-upload"
      />
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50" data-testid="nav-bottom">
        <div className="grid grid-cols-5 items-center h-16 max-w-md mx-auto">
          {navItemsLeft.map(renderNavItem)}
         <NotificationBell />
          <MessagesButton />
          {navItemsRight.map(renderNavItem)}
        </div>
      </nav>
    </>
  );
}

function SettingsMenu() {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { profileData, updateProfile } = useProfile();
  const [accountOpen, setAccountOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const userId = getCurrentUserId();
  const { data: user } = useQuery<UserType>({ queryKey: ["/api/users", userId] });
  const { data: followingList = [] } = useQuery<UserType[]>({ queryKey: ["/api/users", userId, "following"] });
  const followedProfilesCount = followingList.length;
  const legalTexts = legalDocuments[language];

  const [editFormData, setEditFormData] = useState({
    displayName: "",
    username: "",
    email: "",
    bio: "",
    genre: "",
  });

  const [privacySettings, setPrivacySettings] = useState({
    profilePublic: true,
    showActivity: true,
    allowMessages: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    newFollowers: true,
    newMessages: true,
    artistUpdates: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = () => {
   setEditFormData({
      displayName: profileData.displayName,
      username: profileData.username,
      email: profileData.email,
      bio: profileData.bio,
      genre: (profileData as any).genre || "",
    });
    setEditMode(true);
  };

 const handleLogout = () => {
    setLogoutOpen(false);
    localStorage.removeItem("vibyng-user");
    window.location.href = "/";
    toast({
  title: t.disconnected,
  description: t.disconnectedDescription,
  });
  };
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile(editFormData);
      setEditMode(false);
      toast({ title: t.profileUpdated, description: t.profileUpdatedDescription });
    } catch (err) {
      toast({ title: t.error, description: t.profileUpdateError, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid="button-settings">
            <Settings className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" data-testid="menu-settings">
          <DropdownMenuLabel>{t.settings}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAccountOpen(true)} data-testid="menu-item-account">
            <User className="w-4 h-4 mr-2" />
            {t.account}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPrivacyOpen(true)} data-testid="menu-item-privacy">
            <Shield className="w-4 h-4 mr-2" />
            {t.privacy}
          </DropdownMenuItem>
          {(user as any)?.role === "artist" && (
            <DropdownMenuItem onClick={async () => {
              setStripeLoading(true);
              try {
                const res = await fetch(`/api/stripe/connect/status/${userId}`);
                const data = await res.json();
                setStripeStatus(data);
              } catch {}
              setStripeLoading(false);
              setPaymentsOpen(true);
            }}>
              <Zap className="w-4 h-4 mr-2" />
              {t.paymentsTitle}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setNotificationsOpen(true)} data-testid="menu-item-notifications">
            <Bell className="w-4 h-4 mr-2" />
            {t.notifications}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLanguageOpen(true)} data-testid="menu-item-language">
            <Globe className="w-4 h-4 mr-2" />
            {t.language}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
            data-testid="menu-item-theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
            {theme === "dark" ? t.lightTheme : t.darkTheme}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setHelpOpen(true)} data-testid="menu-item-help">
            <HelpCircle className="w-4 h-4 mr-2" />
            {t.help}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTermsOpen(true)} data-testid="menu-item-terms">
            <FileText className="w-4 h-4 mr-2" />
           {t.terms}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPrivacyPolicyOpen(true)} data-testid="menu-item-privacy-policy">
  <Shield className="w-4 h-4 mr-2" />
  {t.privacyPolicy}
</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => setLogoutOpen(true)} data-testid="menu-item-logout">
            <LogOut className="w-4 h-4 mr-2" />
            {t.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={accountOpen} onOpenChange={(open) => { setAccountOpen(open); if (!open) setEditMode(false); }}>
        <DialogContent data-testid="dialog-account">
          <DialogHeader>
            <DialogTitle>{editMode ? t.editProfileTitle : t.accountTitle}</DialogTitle>
            <DialogDescription>
              {editMode ? t.editProfileDescription : t.accountDescription}
            </DialogDescription>
          </DialogHeader>
          {editMode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t.displayName}</Label>
                <Input
                  id="displayName"
                  value={editFormData.displayName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  data-testid="input-display-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{t.username}</Label>
                <Input
                  id="username"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, username: e.target.value }))}
                  data-testid="input-username"
                />
              </div>
             <div className="space-y-2">
                <Label htmlFor="bio">{t.bio}</Label>
                <Textarea
                  id="bio"
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  data-testid="input-bio"
                />
              </div>
              {(profileData as any).role === "artist" && (
                <div className="space-y-2">
                  <Label>Genere musicale</Label>
                  <Input
                    placeholder="Es. Hip-hop, Jazz, Rock..."
                    value={editFormData.genre}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, genre: e.target.value }))}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
               <div className="relative">
  <Avatar className="w-16 h-16">
    <AvatarImage src={profileData.avatarUrl || ""} />
    <AvatarFallback className="bg-primary/10 text-primary text-xl">
      {profileData.displayName.charAt(0)}
    </AvatarFallback>
  </Avatar>
  <label className="absolute bottom-0 right-0 bg-primary rounded-full w-6 h-6 flex items-center justify-center cursor-pointer">
    <Camera className="w-3 h-3 text-white" />
    <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
     reader.onload = async () => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement("canvas");
            const MAX = 400;
            const ratio = Math.min(MAX / img.width, MAX / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL("image/jpeg", 0.7);
            await fetch("/api/uploads/avatar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageData, userId: 4 }),
            });
            await updateProfile({ avatarUrl: imageData });
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      }}
    />
  </label>
</div>
                <div>
                  <h3 className="font-semibold">{profileData.displayName}</h3>
                  <p className="text-sm text-muted-foreground">@{profileData.username}</p>
                  <p className="text-xs text-muted-foreground">{profileData.email}</p>
                </div>
              </div>
              {profileData.bio && (
                <p className="text-sm text-muted-foreground border-t pt-3">{profileData.bio}</p>
              )}
             <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t.memberSince}</span>
                  <span className="text-sm text-muted-foreground">
                   {user?.createdAt
  ? new Date(user.createdAt).toLocaleDateString(language === "it" ? "it-IT" : "en-US", {
      month: "long",
      year: "numeric",
    })
  : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t.followedProfiles}</span>
                  <span className="text-sm text-muted-foreground">{followedProfilesCount ?? "—"}</span>
              </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{t.vibyngPoints}</span>
                  <span className="text-sm font-semibold text-primary">{user?.vibyngPoints ?? 0}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)} data-testid="button-cancel-edit">
                  {t.cancel}
                </Button>
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? t.saving : t.saveChanges}
               </Button>
              </>
           ) : (
  <div className="w-full space-y-2">
    <Button
      className="w-full"
      onClick={handleOpenEdit}
      data-testid="button-edit-profile"
    >
      {t.editProfile}
    </Button>

    <Button
      variant="outline"
      className="w-full"
      onClick={() => setAccountOpen(false)}
    >
      {t.close}
    </Button>

    <div className="border-t border-border pt-4 mt-4">
      <p className="text-sm font-medium text-destructive text-center">
        Elimina definitivamente il tuo profilo
      </p>

      <p className="text-xs text-muted-foreground mt-1 text-center">
        Questa azione è definitiva e non può essere annullata.
      </p>

      <Button
        variant="destructive"
        className="w-full mt-3"
        onClick={() => setDeleteAccountOpen(true)}
      >
        Elimina profilo
      </Button>
    </div>
  </div>
)}
          </DialogFooter>
        </DialogContent>
      </Dialog>

<Dialog
  open={deleteAccountOpen}
  onOpenChange={(open) => {
    setDeleteAccountOpen(open);
    if (!open) {
      setDeleteAccountConfirmText("");
    }
  }}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className="text-destructive">
        {t.deleteAccountTitle}
      </DialogTitle>
      <DialogDescription>
        {t.deleteAccountDescription}
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      <p className="text-sm font-medium">
        {t.deleteAccountConfirmText}
      </p>

      <Input
        value={deleteAccountConfirmText}
        onChange={(e) => setDeleteAccountConfirmText(e.target.value)}
        placeholder={t.deleteAccountInputPlaceholder}
      />

      <div className="flex flex-col gap-2">
        <Button
  variant="destructive"
  disabled={deleteAccountConfirmText !== "ELIMINA"}
  onClick={async () => {
    try {
      await apiRequest("DELETE", `/api/users/${userId}`, {
        confirmText: deleteAccountConfirmText,
      });

      toast({
        title: t.deleteAccountSuccess,
      });

      localStorage.removeItem("vibyng-user");
      localStorage.removeItem("flow-saved-videos");

      queryClient.clear();

      window.location.href = "/";
    } catch {
      toast({
        title: t.error,
        description: t.deleteAccountError,
        variant: "destructive",
      });
    }
  }}
>
  {t.deleteAccountButton}
</Button>

        <Button
          variant="outline"
          onClick={() => {
            setDeleteAccountOpen(false);
            setDeleteAccountConfirmText("");
          }}
        >
          {t.deleteAccountCancel}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
      
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent data-testid="dialog-privacy">
          <DialogHeader>
           <DialogTitle>{t.privacyTitle}</DialogTitle>
            <DialogDescription>{t.privacyDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
           <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50 border border-border/50">
              <Label>{t.publicProfile}</Label>
              <p className="text-xs text-muted-foreground">{t.publicProfileDescription}</p>
              <p className="text-xs text-amber-500 mt-1">🚧 Funzionalità in arrivo — al momento tutti i profili sono pubblici.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setPrivacyOpen(false);
              toast({ title: t.privacyUpdated, description: t.privacyUpdatedDescription });
            }}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent data-testid="dialog-notifications">
          <DialogHeader>
           <DialogTitle>{t.notificationsTitle}</DialogTitle>
           <DialogDescription>{t.notificationsDescription}</DialogDescription>
          </DialogHeader>
         <div className="flex flex-col gap-2 py-4">
            <p className="text-sm text-muted-foreground">Le notifiche push saranno disponibili prossimamente.</p>
            <p className="text-xs text-amber-500">🚧 Funzionalità in arrivo</p>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setNotificationsOpen(false);
              toast({ title: t.notificationsUpdated, description: t.notificationsUpdatedDescription });
            }}>{t.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={languageOpen} onOpenChange={setLanguageOpen}>
        <DialogContent data-testid="dialog-language">
          <DialogHeader>
           <DialogTitle>{t.languageTitle}</DialogTitle>
            <DialogDescription>{t.languageDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={language} onValueChange={(value) => setLanguage(value as AppLanguage)}>
              <SelectTrigger data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="it">Italiano</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
           <Button onClick={() => {
  setLanguageOpen(false);
  toast({
    title: t.languageUpdated,
    description: t.languageUpdatedDescription,
  });
}}>
  {t.save}
</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

     <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
  <DialogContent data-testid="dialog-help">
    <DialogHeader>
      <DialogTitle>{t.helpTitle}</DialogTitle>
      <DialogDescription>{t.helpDescription}</DialogDescription>
    </DialogHeader>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => {
  setHelpOpen(false);
  setFaqOpen(true);
}} data-testid="button-faq">
  <FileText className="w-4 h-4 mr-2" />
  {t.faq}
</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => {
  setHelpOpen(false);
  window.location.href = "mailto:support@vibyng.com";
}} data-testid="button-contact">
  <MessageCircle className="w-4 h-4 mr-2" />
  {t.contactSupport}
</Button>
          </div>
          <div className="text-center text-xs text-muted-foreground pt-2 border-t">
            <p>Vibyng v1.0.0</p>
            <p>support@vibyng.com</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto" data-testid="dialog-terms">
          <DialogHeader>
            <DialogTitle>{t.termsTitle}</DialogTitle>
             <DialogDescription>{t.termsDescription}</DialogDescription>
          </DialogHeader>
          
         <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed pr-2">
  {legalTexts.terms}
</div>
          
          <DialogFooter>
            <Button onClick={() => setTermsOpen(false)}>{t.understood}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

<Dialog open={privacyPolicyOpen} onOpenChange={setPrivacyPolicyOpen}>
  <DialogContent className="max-h-[80vh] overflow-y-auto" data-testid="dialog-privacy-policy">
    <DialogHeader>
      <DialogTitle>{t.privacyPolicy}</DialogTitle>
      <DialogDescription>{t.privacyDescription}</DialogDescription>
    </DialogHeader>

    <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed pr-2">
      {legalTexts.privacy}
    </div>

    <DialogFooter>
      <Button onClick={() => setPrivacyPolicyOpen(false)}>{t.understood}</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent data-testid="dialog-logout">
          <DialogHeader>
            <DialogTitle>{t.logoutTitle}</DialogTitle>
             <DialogDescription>{t.logoutDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLogoutOpen(false)} data-testid="button-cancel-logout">
  <X className="w-4 h-4 mr-2" />
  {t.cancel}
</Button>
           <Button variant="destructive" onClick={handleLogout} data-testid="button-confirm-logout">
  <Check className="w-4 h-4 mr-2" />
  {t.logout}
</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={paymentsOpen} onOpenChange={setPaymentsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.paymentsTitle}</DialogTitle>
            <DialogDescription>{t.paymentsDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {stripeLoading ? (
              <p className="text-sm text-muted-foreground">Caricamento...</p>
            ) : stripeStatus?.connected ? (
              <>
                <p className="text-sm font-medium text-green-600">{t.stripeConnected}</p>
                <p className="text-sm text-muted-foreground">
                  {stripeStatus.onboardingComplete ? t.stripeOnboardingComplete : t.stripeOnboardingPending}
                </p>
                {stripeStatus.onboardingComplete ? (
                  <Button className="w-full" onClick={async () => {
                    const res = await fetch(`/api/stripe/connect/dashboard-link/${userId}`, { method: "POST" });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  }}>
                    {t.openStripeDashboard}
                  </Button>
                ) : (
                  <Button className="w-full" onClick={async () => {
                    const res = await fetch("/api/stripe/connect/create-account", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ artistId: userId }),
                    });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  }}>
                    {t.connectStripe}
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t.stripeNotConnected}</p>
                <p className="text-xs text-muted-foreground">
                  Collega il tuo account Stripe per ricevere i pagamenti dai fan direttamente sul tuo conto bancario.
                </p>
                <Button className="w-full" onClick={async () => {
                  setStripeLoading(true);
                  try {
                    const res = await fetch("/api/stripe/connect/create-account", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ artistId: userId }),
                    });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  } catch {}
                  setStripeLoading(false);
                }}>
                  {stripeLoading ? t.stripeConnecting : t.connectStripe}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.faqTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(t.faqItems as any[]).map((item: any, index: number) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full text-left px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-muted/50 transition-colors"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                >
                  <span>{item.q}</span>
                  <span className="text-muted-foreground ml-2">{openFaqIndex === index ? "▲" : "▼"}</span>
                </button>
                {openFaqIndex === index && (
                  <div className="px-4 pb-3 text-sm text-muted-foreground border-t pt-2">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
function AppLayout() {
  const [location, setLocation] = useLocation();
  const handleLogoClick = () => {
    if (location !== "/") {
      setLocation("/");
    }
    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between h-14 px-4 max-w-md mx-auto gap-4">
        <button onClick={handleLogoClick} className="flex items-center gap-2 cursor-pointer">
  <Music className="w-6 h-6 text-primary" />
  <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
    Vibyng
  </span>
</button>
          <div className="flex items-center gap-1">
            <SettingsMenu />
          </div>
        </div>
      </header>
      <main className="pb-36 pt-4 px-4 max-w-md mx-auto overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <Router />
      </main>
      <AppAudioPlayer />
      <BottomNav />
    </div>
  );
}

function AppWithAuth() {
  const [currentUser, setCurrentUser] = useState<any>(getStoredUser());
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);

const handleLogin = (user: any) => {
    localStorage.setItem("vibyng-user", JSON.stringify(user));
    setCurrentUser(user);
    const isFirstLogin = !user.bio && !user.avatarUrl;
    if (isFirstLogin) {
      setNeedsOnboarding(true);
    } else {
      window.location.reload();
    }
  };

  const handleRegister = (user: any) => {
    localStorage.setItem("vibyng-user", JSON.stringify(user));
    setCurrentUser(user);
    setNeedsOnboarding(true);
  };

  const handleOnboardingComplete = (updatedUser: any) => {
    localStorage.setItem("vibyng-user", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setNeedsOnboarding(false);
  };

  if (!currentUser) {
    const isResetPassword = window.location.pathname === "/reset-password";
    if (isResetPassword) {
      return <ResetPassword />;
    }
    return <AuthPage onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (needsOnboarding) {
    return <Onboarding user={currentUser} onComplete={handleOnboardingComplete} />;
  }

  return <AppLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
       <LanguageProvider>
           <ProfileProvider>
          <AudioPlayerProvider>
            <TooltipProvider>
              <AppWithAuth />
              <Toaster />
            </TooltipProvider>
          </AudioPlayerProvider>
           </ProfileProvider>
       </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
export default App;
