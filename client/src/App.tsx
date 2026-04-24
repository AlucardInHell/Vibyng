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
import { AudioPlayerProvider, MiniPlayer } from "@/components/audio-player";
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

helpTitle: "Assistenza",
helpDescription: "Come possiamo aiutarti?",
faq: "Domande Frequenti (FAQ)",
faqToastTitle: "FAQ",
faqToastDescription: "Apertura FAQ...",
contactSupport: "Contatta il Supporto",
supportToastTitle: "Supporto",
supportToastDescription: "Email inviata a supporto@vibyng.com",
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

helpTitle: "Help",
helpDescription: "How can we help you?",
faq: "Frequently Asked Questions (FAQ)",
faqToastTitle: "FAQ",
faqToastDescription: "Opening FAQ...",
contactSupport: "Contact Support",
supportToastTitle: "Support",
supportToastDescription: "Email sent to support@vibyng.com",
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
  } : {
    displayName: "",
    username: "",
    email: "",
    bio: "",
    avatarUrl: null,
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
      if (stored) return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
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
function MessagesButton() {
  const { t } = useLanguage();
  const [location] = useLocation();
  const isActive = location === "/messages";
  const storedUser = localStorage.getItem("vibyng-user");
  const userId = storedUser ? JSON.parse(storedUser).id : 0;
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
    <Link href="/messages">
      <button
        className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-md transition-colors relative ${
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
        <span className="text-xs font-medium">{t.messages}</span>
      </button>
    </Link>
  );
}
function NotificationBell() {
  const { t } = useLanguage();
  const [location] = useLocation();
  const isActive = location === "/notifications";
  const storedUser = localStorage.getItem("vibyng-user");
  const userId = storedUser ? JSON.parse(storedUser).id : 0;
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
    <Link href="/notifications">
      <button
        className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-md transition-colors relative ${
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
        <span className="text-xs font-medium">{t.notifications}</span>
      </button>
    </Link>
  );
}
function BottomNav() {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  
  const handleFeedRefresh = () => {
  if (location !== "/") {
    setLocation("/");
  }
  queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
  queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
  window.scrollTo({ top: 0, behavior: "smooth" });
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
        title: `${type} caricato`,
        description: `"${file.name}" è stato selezionato con successo`,
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
        className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-md transition-colors ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        data-testid={`nav-${item.label.toLowerCase()}`}
      >
        <item.icon className="w-5 h-5" />
        <span className="text-xs font-medium">{item.label}</span>
      </button>
    );
  }

  return (
    <Link key={item.path} href={item.path}>
      <button
        className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-md transition-colors ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        data-testid={`nav-${item.label.toLowerCase()}`}
      >
        <item.icon className="w-5 h-5" />
        <span className="text-xs font-medium">{item.label}</span>
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
        onChange={(e) => handleFileSelected(e, "Foto")}
        className="hidden"
        data-testid="input-photo-capture"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={(e) => handleFileSelected(e, "Video")}
        className="hidden"
        data-testid="input-video-capture"
      />
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        onChange={(e) => handleFileSelected(e, "File")}
        className="hidden"
        data-testid="input-media-upload"
      />
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50" data-testid="nav-bottom">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
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
  const [editMode, setEditMode] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const userId = getCurrentUserId();
  const { data: user } = useQuery<UserType>({ queryKey: ["/api/users", userId] });
  const { data: followingList = [] } = useQuery<UserType[]>({ queryKey: ["/api/users", userId, "following"] });
  const followedProfilesCount = followingList.length;

  const [editFormData, setEditFormData] = useState({
    displayName: "",
    username: "",
    email: "",
    bio: "",
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
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                  data-testid="input-email"
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
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("it-IT", { month: "long", year: "numeric" }) : "—"}
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
                <Button onClick={handleSaveProfile} disabled={isSaving} data-testid="button-save-profile">
                  {isSaving ? "{t.saving}..." : "{t.saveChanges}"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setAccountOpen(false)}>{t.close}</Button>
                <Button onClick={handleOpenEdit} data-testid="button-edit-profile">
                  {t.editProfile}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent data-testid="dialog-privacy">
          <DialogHeader>
           <DialogTitle>{t.privacyTitle}</DialogTitle>
            <DialogDescription>{t.privacyDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t.publicProfile}</Label>
              <p className="text-xs text-muted-foreground">{t.publicProfileDescription}</p>
              </div>
              <SwitchUI 
                checked={privacySettings.profilePublic} 
                onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, profilePublic: checked }))}
                data-testid="switch-profile-public"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
               <Label>{t.showActivity}</Label>
               <p className="text-xs text-muted-foreground">{t.showActivityDescription}</p>
              </div>
              <SwitchUI 
                checked={privacySettings.showActivity} 
                onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, showActivity: checked }))}
                data-testid="switch-show-activity"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t.allowMessages}</Label>
              <p className="text-xs text-muted-foreground">{t.allowMessagesDescription}</p>
              </div>
              <SwitchUI 
                checked={privacySettings.allowMessages} 
                onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, allowMessages: checked }))}
                data-testid="switch-allow-messages"
              />
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t.pushNotifications}</Label>
                <p className="text-xs text-muted-foreground">{t.pushNotificationsDescription}</p>
              </div>
              <SwitchUI 
                checked={notificationSettings.pushEnabled} 
                onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, pushEnabled: checked }))}
                data-testid="switch-push"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t.emailNotifications}</Label>
               <p className="text-xs text-muted-foreground">{t.emailNotificationsDescription}</p>
              </div>
              <SwitchUI 
                checked={notificationSettings.emailEnabled} 
                onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailEnabled: checked }))}
                data-testid="switch-email"
              />
            </div>
            <div className="border-t pt-3 space-y-3">
             <p className="text-sm font-medium">{t.notificationTypes}</p>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">{t.newFollowers}</Label>
                <SwitchUI 
                  checked={notificationSettings.newFollowers} 
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, newFollowers: checked }))}
                  data-testid="switch-followers"
                />
              </div>
              <div className="flex items-center justify-between">
               <Label className="text-sm font-normal">{t.newMessages}</Label>
                <SwitchUI 
                  checked={notificationSettings.newMessages} 
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, newMessages: checked }))}
                  data-testid="switch-messages"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">{t.artistUpdates}</Label>
                <SwitchUI 
                  checked={notificationSettings.artistUpdates} 
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, artistUpdates: checked }))}
                  data-testid="switch-artist-updates"
                />
              </div>
            </div>
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
  toast({ title: t.faqToastTitle, description: t.faqToastDescription });
}} data-testid="button-faq">
  <FileText className="w-4 h-4 mr-2" />
  {t.faq}
</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => {
  setHelpOpen(false);
  toast({ title: t.supportToastTitle, description: t.supportToastDescription });
}} data-testid="button-contact">
  <MessageCircle className="w-4 h-4 mr-2" />
  {t.contactSupport}
</Button><Button variant="outline" className="w-full justify-start" onClick={() => {
  setHelpOpen(false);
  toast({ title: t.bugToastTitle, description: t.bugToastDescription });
}} data-testid="button-bug">
  <HelpCircle className="w-4 h-4 mr-2" />
  {t.reportProblem}
</Button>
          </div>
          <div className="text-center text-xs text-muted-foreground pt-2 border-t">
            <p>Vibyng v1.0.0</p>
            <p>supporto@vibyng.com</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto" data-testid="dialog-terms">
          <DialogHeader>
            <DialogTitle>{t.termsTitle}</DialogTitle>
             <DialogDescription>{t.termsDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1">1. Accettazione dei Termini</h4>
              <p className="text-muted-foreground">
                Utilizzando Vibyng, accetti di essere vincolato da questi termini di servizio. 
                Se non accetti questi termini, non utilizzare la piattaforma.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">2. Uso della Piattaforma</h4>
              <p className="text-muted-foreground">
                Vibyng è una piattaforma per connettere artisti e fan. Gli utenti devono 
                comportarsi in modo rispettoso e non pubblicare contenuti offensivi o illegali.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">3. VibyngPoints</h4>
              <p className="text-muted-foreground">
                I VibyngPoints sono una valuta virtuale della piattaforma. Non hanno valore 
                monetario reale e non sono rimborsabili.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">4. Privacy</h4>
              <p className="text-muted-foreground">
                I tuoi dati sono protetti secondo la nostra Informativa sulla Privacy. 
                Non condividiamo i tuoi dati personali con terze parti senza il tuo consenso.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">5. Proprietà Intellettuale</h4>
              <p className="text-muted-foreground">
                Gli artisti mantengono tutti i diritti sui contenuti che pubblicano. 
                Vibyng ha una licenza per visualizzare e distribuire tali contenuti sulla piattaforma.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTermsOpen(false)}>{t.understood}</Button>
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
      <main className="pb-36 pt-4 px-4 max-w-md mx-auto overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <Router />
      </main>
      <MiniPlayer />
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
