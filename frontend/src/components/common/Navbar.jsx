import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { 
  MapPin, 
  ChevronDown, 
  Menu, 
  X, 
  User, 
  LogOut, 
  Briefcase, 
  ShieldCheck, 
  LocateFixed, 
  Check, 
  Plus,
  Bell,
  Search,
  MessageSquare,
  Settings,
  FileText,
  Clock,
  CalendarDays,
  Wrench,
  DollarSign,
  Star,
  HelpCircle,
  AlertTriangle,
  CheckCheck,
  ArrowRight,
  Zap,
  Droplets,
  Wind,
  Cpu,
  Hammer,
  Sparkles,
  Paintbrush,
  Bug,
  KeyRound,
  Key,
  Car,
  Truck,
  HardHat,
  Layers,
  Shield,
  Sprout,
  Shirt,
  Scissors,
  Laptop,
  Camera,
  Router,
  Gauge,
  Flame,
  Sun,
  Home as HomeIcon,
  PanelTop,
  Maximize2,
  CheckSquare,
  CarFront,
  Video
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLocation as useGeoLocation } from '../../hooks/useLocation';
import { useSocketContext } from '../../context/SocketContext';
import { useNotifications } from '../../context/NotificationContext';
import chatAPI from '../../api/chat.api';
import { categoryAPI } from '../../api/category.api';
import { CATEGORIES_LIST } from '../../utils/constants';
import logoSvg from '../../assets/logo.svg';

const MEGA_MENU_ICONS = {
  Zap,
  Droplets,
  Wind,
  Cpu,
  Hammer,
  Sparkles,
  Paintbrush,
  Bug,
  KeyRound,
  Key: KeyRound,
  Car,
  Truck,
  HardHat,
  Layers,
  Shield,
  Sprout,
  Shirt,
  Scissors,
  Laptop,
  Camera,
  Router,
  Gauge,
  Flame,
  Sun,
  Home: HomeIcon,
  PanelTop,
  Maximize2,
  CheckSquare,
  CarFront,
  Video,
  Wrench
};

const MEGA_MENU_GROUPS = [
  {
    id: 'home-maintenance',
    title: 'Home Maintenance',
    slugs: [
      'electrical-services',
      'plumbing-services',
      'ac-hvac-services',
      'appliance-repair',
      'carpentry-furniture',
      'painting-services',
      'home-cleaning',
      'pest-control',
      'locksmith-services',
      'waterproofing-roofing'
    ]
  },
  {
    id: 'repair-installation',
    title: 'Repair & Installation',
    slugs: [
      'computer-laptop-repair',
      'cctv-security',
      'internet-networking',
      'ro-water-purifier',
      'geyser-water-heater',
      'solar-panel-services',
      'glass-aluminium',
      'curtains-blinds',
      'home-installation'
    ]
  },
  {
    id: 'moving-construction',
    title: 'Moving & Construction',
    slugs: [
      'packers-movers',
      'construction-masonry',
      'tile-flooring',
      'interior-design',
      'gardening-landscaping'
    ]
  },
  {
    id: 'personal-other',
    title: 'Personal & Other Services',
    slugs: [
      'laundry-dry-cleaning',
      'beauty-salon',
      'vehicle-repair',
      'driving-transportation',
      'event-photography',
      'other-services'
    ]
  }
];

const POPULAR_LOCATIONS = [
  'Lucknow (All Areas)',
  'Gomti Nagar, Lucknow',
  'Hazratganj, Lucknow',
  'Indira Nagar, Lucknow',
  'Alambagh, Lucknow',
  'Mahanagar, Lucknow',
  'Ashiyana, Lucknow',
  'Chowk, Lucknow',
  'Jankipuram, Lucknow',
  'Vikas Nagar, Lucknow'
];

export default function Navbar({ onOpenPostJob, onSearchTrigger }) {
  const { user, logout, switchRole } = useAuth();
  const { location: geoLoc, detectLocation } = useGeoLocation();
  const { socket } = useSocketContext();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();

  // Navigation & dropdown state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [tabletMenuOpen, setTabletMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Lucknow, UP');
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Mega Menu state
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [megaMenuSearch, setMegaMenuSearch] = useState('');
  const [mobileExploreExpanded, setMobileExploreExpanded] = useState(false);
  const [categoriesList, setCategoriesList] = useState(CATEGORIES_LIST);
  const megaMenuTimeoutRef = useRef(null);
  const megaMenuContainerRef = useRef(null);

  // Sync real categories from backend on mount
  useEffect(() => {
    let isMounted = true;
    categoryAPI.getAll().then((res) => {
      if (isMounted && res?.categories && res.categories.length > 0) {
        setCategoriesList(res.categories);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Compute categories grouped into 4 distinct groups
  const megaMenuGroups = React.useMemo(() => {
    const query = megaMenuSearch.trim().toLowerCase();
    const allKnownSlugs = new Set(MEGA_MENU_GROUPS.flatMap((g) => g.slugs));
    const extraCategories = categoriesList.filter((c) => !allKnownSlugs.has(c.slug));

    return MEGA_MENU_GROUPS.map((group) => {
      let items = categoriesList.filter((cat) => group.slugs.includes(cat.slug));

      // Append any unassigned categories to the 4th group
      if (group.id === 'personal-other' && extraCategories.length > 0) {
        items = [...items, ...extraCategories];
      }

      if (query) {
        items = items.filter((cat) =>
          cat.name?.toLowerCase().includes(query) ||
          cat.slug?.toLowerCase().includes(query) ||
          cat.description?.toLowerCase().includes(query) ||
          (Array.isArray(cat.subcategories) && cat.subcategories.some(s => typeof s === 'string' && s.toLowerCase().includes(query)))
        );
      }

      return {
        ...group,
        items
      };
    });
  }, [categoriesList, megaMenuSearch]);

  // Sync unread messages count
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }
    const fetchUnread = async () => {
      try {
        const res = await chatAPI.getUnreadCount();
        if (res?.success) setUnreadMessages(res.unreadCount || 0);
      } catch {}
    };
    fetchUnread();
  }, [user, routerLocation.pathname]);

  // Real-time updates for unread messages badge
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      chatAPI.getUnreadCount().then((res) => {
        if (res?.success) setUnreadMessages(res.unreadCount || 0);
      }).catch(() => {});
    };

    socket.on('new_message_notification', handleUpdate);
    socket.on('messages_read', handleUpdate);

    return () => {
      socket.off('new_message_notification', handleUpdate);
      socket.off('messages_read', handleUpdate);
    };
  }, [socket]);

  // Refs for click-outside dismissal
  const userDropdownRef = useRef(null);
  const locationDropdownRef = useRef(null);
  const tabletMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Sync initial or detected location
  useEffect(() => {
    if (geoLoc?.city) {
      setSelectedCity(geoLoc.city);
    }
  }, [geoLoc?.city]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setLocationDropdownOpen(false);
      }
      if (tabletMenuRef.current && !tabletMenuRef.current.contains(event.target)) {
        setTabletMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (megaMenuContainerRef.current && !megaMenuContainerRef.current.contains(event.target)) {
        setMegaMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard accessibility
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setUserDropdownOpen(false);
        setLocationDropdownOpen(false);
        setTabletMenuOpen(false);
        setNotificationsOpen(false);
        setMobileMenuOpen(false);
        setMegaMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setLocationDropdownOpen(false);
    setTabletMenuOpen(false);
    setNotificationsOpen(false);
    setMegaMenuOpen(false);
    setMegaMenuSearch('');
  }, [routerLocation.pathname]);

  const navLinks = user?.role === 'vendor'
    ? [
        { label: 'Home', to: '/' },
        { label: 'Find Available Jobs', to: '/vendor/browse-jobs' },
        { label: 'My Services', to: '/vendor/services' },
        { label: 'How It Works', to: '/how-it-works' },
      ]
    : user?.role === 'customer'
    ? [
        { label: 'Home', to: '/' },
        { label: 'Explore Services', to: '/categories' },
        { label: 'Emergency', to: '/emergency', isEmergency: true },
        { label: 'Find a Professional', to: '/professionals' },
        { label: 'My Jobs', to: '/customer/my-jobs' },
        { label: 'How It Works', to: '/how-it-works' },
      ]
    : user?.role === 'admin'
    ? [
        { label: 'Home', to: '/' },
        { label: 'Explore Services', to: '/categories' },
        { label: 'Emergency', to: '/emergency', isEmergency: true },
        { label: 'Find Available Jobs', to: '/jobs' },
        { label: 'Admin Console', to: '/admin/dashboard' },
      ]
    : [
        { label: 'Home', to: '/' },
        { label: 'Explore Services', to: '/categories' },
        { label: 'Emergency', to: '/emergency', isEmergency: true },
        { label: 'Find a Professional', to: '/professionals' },
        { label: 'My Jobs', to: '/customer/my-jobs' },
        { label: 'How It Works', to: '/how-it-works' },
      ];

  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setLocationDropdownOpen(false);
  };

  const handleDetectGPS = () => {
    detectLocation();
    setLocationDropdownOpen(false);
  };

  const [switchingRole, setSwitchingRole] = useState(null);

  const handleDemoSwitch = async (role) => {
    if (switchingRole) return;
    setSwitchingRole(role);
    try {
      const ok = await switchRole(role);
      if (ok) {
        if (role === 'vendor') {
          navigate('/vendor/dashboard');
        } else if (role === 'admin') {
          navigate('/admin/dashboard');
        } else if (role === 'customer') {
          if (
            routerLocation.pathname.startsWith('/vendor') ||
            routerLocation.pathname.startsWith('/admin') ||
            routerLocation.pathname === '/login' ||
            routerLocation.pathname === '/register'
          ) {
            navigate('/customer/dashboard');
          }
        } else if (role === 'guest') {
          if (
            routerLocation.pathname.startsWith('/vendor') ||
            routerLocation.pathname.startsWith('/admin') ||
            routerLocation.pathname.startsWith('/customer')
          ) {
            navigate('/');
          }
        }
      }
    } finally {
      setSwitchingRole(null);
    }
  };

  const handleSignOut = () => {
    logout();
    setUserDropdownOpen(false);
    navigate('/');
  };

  const isDev = Boolean(import.meta.env.DEV || import.meta.env.MODE === 'development');

  return (
    <>
      {/* 1. Quick Demo Switcher Strip (Development Only) */}
      {isDev && (
        <div className="bg-slate-50 border-b border-slate-200 text-xs py-1.5 px-4 text-slate-600">
          <div className="page-container flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse" />
              <span className="font-medium text-slate-700">WorkLogy Hyperlocal Network</span>
              <span className="hidden sm:inline text-slate-400">|</span>
              <span className="hidden sm:inline text-slate-500">Fast Local Trades & Repairs</span>
            </div>

            {/* Role Preview Switcher for Development & Review */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 mr-1 hidden md:inline">Demo Switcher:</span>
            <button
              disabled={!!switchingRole}
              onClick={() => handleDemoSwitch('customer')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                user?.role === 'customer'
                  ? 'bg-[#06684F] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              } ${switchingRole === 'customer' ? 'opacity-70 animate-pulse' : ''}`}
              title="Switch to Customer Role"
            >
              {switchingRole === 'customer' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              Customer (Alex)
            </button>
            <button
              disabled={!!switchingRole}
              onClick={() => handleDemoSwitch('vendor')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                user?.role === 'vendor'
                  ? 'bg-[#06684F] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              } ${switchingRole === 'vendor' ? 'opacity-70 animate-pulse' : ''}`}
              title="Switch to Vendor Role"
            >
              {switchingRole === 'vendor' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              Vendor (Marcus)
            </button>
            <button
              disabled={!!switchingRole}
              onClick={() => handleDemoSwitch('admin')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                user?.role === 'admin'
                  ? 'bg-[#06684F] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              } ${switchingRole === 'admin' ? 'opacity-70 animate-pulse' : ''}`}
              title="Switch to Admin Role"
            >
              {switchingRole === 'admin' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              Admin (Sarah)
            </button>
            <button
              disabled={!!switchingRole}
              onClick={() => handleDemoSwitch('guest')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                !user
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="View as Guest / Unauthenticated"
            >
              {switchingRole === 'guest' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              Guest
            </button>
          </div>
        </div>
      </div>
      )}

      {/* 2. Main WorkLogy Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/90 shadow-2xs transition-all relative">
        <div className="page-container">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4 lg:gap-5">
            
            {/* ── LEFT: WorkLogy Logo and Brand ── */}
            <div className="flex items-center shrink-0">
              <Link 
                to="/" 
                className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[#06684F] focus:ring-offset-2 rounded-lg py-1 px-1 -ml-1 transition-colors select-none"
                aria-label="WorkLogy Home"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/90 flex items-center justify-center p-1.5 shrink-0 transition-transform group-hover:scale-105 shadow-2xs">
                  <img src={logoSvg} alt="WorkLogy Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col whitespace-nowrap">
                  <span className="text-xl font-black tracking-tight text-[#111827] leading-none group-hover:text-[#06684F] transition-colors">
                    Work<span className="text-[#06684F]">Logy</span>
                  </span>
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider leading-none mt-1">
                    Verified Trade Pros
                  </span>
                </div>
              </Link>
            </div>

            {/* ── CENTER: Navigation Links ── */}
            <nav className="hidden md:flex items-center justify-center gap-0.5 lg:gap-1 xl:gap-1.5 whitespace-nowrap shrink min-w-0" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const isExplore = link.label === 'Explore Services';
                const isActive = link.to === '/' 
                  ? routerLocation.pathname === '/' 
                  : routerLocation.pathname === link.to || routerLocation.pathname.startsWith(link.to + '/');

                if (isExplore) {
                  return (
                    <div
                      key={link.to}
                      className="relative shrink-0"
                      onMouseEnter={() => {
                        if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
                        setMegaMenuOpen(true);
                      }}
                      onMouseLeave={() => {
                        megaMenuTimeoutRef.current = setTimeout(() => {
                          setMegaMenuOpen(false);
                        }, 200);
                      }}
                    >
                      <Link
                        to={link.to}
                        onClick={(e) => {
                          if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                            e.preventDefault();
                            setMegaMenuOpen((prev) => !prev);
                          }
                        }}
                        className={`h-9 px-2 lg:px-2.5 xl:px-3 rounded-lg text-xs lg:text-[13px] xl:text-sm font-medium whitespace-nowrap inline-flex items-center gap-1 xl:gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#06684F] ${
                          isActive || megaMenuOpen
                            ? 'bg-emerald-50 text-[#06684F] font-semibold border border-emerald-200/60 shadow-2xs'
                            : 'text-slate-700 hover:text-[#06684F] hover:bg-slate-50'
                        }`}
                        aria-expanded={megaMenuOpen}
                        aria-haspopup="true"
                      >
                        <span className="whitespace-nowrap">{link.label}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                            megaMenuOpen ? 'rotate-180 text-[#06684F]' : 'text-slate-400 group-hover:text-[#06684F]'
                          }`}
                        />
                      </Link>
                    </div>
                  );
                }

                const isEmergency = link.isEmergency || link.label === 'Emergency';
                if (isEmergency) {
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`h-9 px-2 lg:px-2.5 xl:px-3 rounded-lg text-xs lg:text-[13px] xl:text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                        isActive
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold shadow-2xs'
                          : 'bg-rose-50 text-rose-700 border border-rose-200/90 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-300'
                      }`}
                      title="Urgent 24/7 Emergency Repairs"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
                      <span className="whitespace-nowrap">{link.label}</span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`h-9 px-2 lg:px-2.5 xl:px-3 rounded-lg text-xs lg:text-[13px] xl:text-sm font-medium whitespace-nowrap inline-flex items-center transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[#06684F] ${
                      isActive
                        ? 'bg-emerald-50 text-[#06684F] font-semibold border border-emerald-200/60 shadow-2xs'
                        : 'text-slate-700 hover:text-[#06684F] hover:bg-slate-50'
                    }`}
                  >
                    <span className="whitespace-nowrap">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* ── RIGHT: Location, Search, Notifications, Auth & Post Job ── */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2 shrink-0">
              
              {/* Location Selector Dropdown */}
              <div className="relative shrink-0" ref={locationDropdownRef}>
                <button
                  type="button"
                  onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                  aria-expanded={locationDropdownOpen}
                  aria-haspopup="true"
                  className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-[#06684F] whitespace-nowrap shrink-0"
                  title="Select Service Location"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="max-w-[75px] lg:max-w-[100px] xl:max-w-[125px] truncate font-medium text-slate-800">
                    {selectedCity || 'Nearby Area'}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0 ${locationDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {locationDropdownOpen && (
                  <div 
                    role="menu"
                    className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 text-sm focus:outline-none"
                  >
                    <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Location</span>
                      {geoLoc?.loading && <span className="text-xs text-emerald-700 animate-pulse">Detecting...</span>}
                    </div>

                    <button
                      type="button"
                      onClick={handleDetectGPS}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-emerald-800 hover:bg-emerald-50 font-medium transition"
                    >
                      <LocateFixed className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <span>Use My Current Location</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />
                    <div className="px-3.5 py-1 text-xs text-slate-400 font-medium">Popular Metro Areas</div>
                    <div className="max-h-48 overflow-y-auto">
                      {POPULAR_LOCATIONS.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => handleSelectCity(city)}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-sm transition ${
                            selectedCity === city
                              ? 'bg-emerald-50 text-emerald-900 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{city}</span>
                          {selectedCity === city && <Check className="w-4 h-4 text-emerald-700" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Search Action */}
              <button
                type="button"
                onClick={onSearchTrigger || (() => navigate(user?.role === 'vendor' ? '/vendor/browse-jobs' : '/professionals'))}
                className="h-9 w-9 inline-flex items-center justify-center text-slate-600 hover:text-[#06684F] hover:bg-slate-100 rounded-lg transition shrink-0 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                title={user?.role === 'vendor' ? 'Search job leads' : 'Search services & pros'}
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Notifications with Unread Count */}
              {user && (
                <div className="relative shrink-0" ref={notificationsRef}>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="h-9 w-9 inline-flex items-center justify-center text-slate-600 hover:text-[#06684F] hover:bg-slate-100 rounded-lg transition relative shrink-0 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                    title="Notifications"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white shadow-xs">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-sm overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Notifications</span>
                          {unreadCount > 0 ? (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                              {unreadCount} unread
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">0 unread</span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAllAsRead();
                            }}
                            className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {notifications && notifications.length > 0 ? (
                          notifications.slice(0, 10).map((notif) => {
                            const notifId = notif._id || notif.id;
                            return (
                              <div
                                key={notifId}
                                onClick={() => {
                                  if (!notif.isRead && notifId) {
                                    markAsRead(notifId);
                                  }
                                  if (notif.link) {
                                    setNotificationsOpen(false);
                                    navigate(notif.link);
                                  }
                                }}
                                className={`px-4 py-2.5 transition cursor-pointer flex items-start justify-between gap-3 ${
                                  notif.isRead ? 'bg-white hover:bg-slate-50' : 'bg-emerald-50/50 hover:bg-emerald-50'
                                }`}
                              >
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    {!notif.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                                    )}
                                    <p className={`text-xs truncate ${notif.isRead ? 'font-medium text-slate-800' : 'font-bold text-slate-900'}`}>
                                      {notif.title}
                                    </p>
                                  </div>
                                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                    {notif.message}
                                  </p>
                                  <span className="text-[10px] text-slate-400 block pt-0.5">
                                    {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (notif.time || 'Recently')}
                                  </span>
                                </div>
                                {!notif.isRead && notifId && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notifId);
                                    }}
                                    title="Mark as read"
                                    className="p-1 text-slate-400 hover:text-emerald-800 rounded hover:bg-white shrink-0"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-4 py-8 text-center text-xs text-slate-500">
                            <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                            No notifications right now.
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-center">
                        <Link
                          to={user.role === 'vendor' ? '/vendor/notifications' : '/customer/notifications'}
                          onClick={() => setNotificationsOpen(false)}
                          className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:underline"
                        >
                          View all notifications →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Direct Messages Icon Button */}
              {user && (
                <Link
                  to={user.role === 'vendor' ? '/vendor/messages' : '/customer/messages'}
                  className="h-9 w-9 inline-flex items-center justify-center text-slate-600 hover:text-[#06684F] hover:bg-slate-100 rounded-lg transition relative shrink-0 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                  title="Direct Messages"
                  aria-label="Direct Messages"
                >
                  <MessageSquare className="w-4 h-4" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white shadow-xs">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              )}

              {/* Authentication & User Roles */}
              {user ? (
                <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
                  
                  {/* Primary Action Button by Role */}
                  {user.role === 'customer' && (
                    <button
                      type="button"
                      onClick={onOpenPostJob || (() => navigate('/customer/create-job'))}
                      className="h-9 inline-flex items-center gap-1.5 px-3 xl:px-3.5 rounded-lg bg-[#06684F] hover:bg-[#055742] text-white text-xs xl:text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Request a Service</span>
                    </button>
                  )}

                  {user.role === 'vendor' && (
                    <Link
                      to="/vendor/dashboard"
                      className={`h-9 inline-flex items-center gap-1.5 px-3 xl:px-3.5 rounded-lg text-xs xl:text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-[#06684F] ${
                        routerLocation.pathname === '/vendor/dashboard'
                          ? 'bg-[#044837] text-white ring-2 ring-[#06684F]'
                          : 'bg-[#06684F] hover:bg-[#055742] text-white'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Professional Dashboard</span>
                    </Link>
                  )}

                  {user.role === 'admin' && (
                    <Link
                      to="/admin/dashboard"
                      className="h-9 inline-flex items-center gap-1.5 px-3 xl:px-3.5 rounded-lg bg-[#06684F] hover:bg-[#055742] text-white text-xs xl:text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Admin Console</span>
                    </Link>
                  )}

                  {/* User Profile Avatar Dropdown */}
                  <div className="relative shrink-0" ref={userDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      aria-expanded={userDropdownOpen}
                      aria-haspopup="true"
                      className="h-9 inline-flex items-center gap-1.5 p-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-[#06684F] shrink-0"
                      aria-label="User account menu"
                    >
                      <img
                        src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                        alt={user.name}
                        className="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0"
                      />
                      <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-200 shrink-0 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userDropdownOpen && (
                      <div 
                        role="menu"
                        className={`absolute right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 text-sm focus:outline-none max-h-[85vh] overflow-y-auto ${
                          user.role === 'vendor' ? 'w-72' : 'w-64'
                        }`}
                      >
                        <div className="px-4 py-2.5 border-b border-slate-100">
                          <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                          <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {user.role === 'customer' ? 'Customer Account' : user.role === 'vendor' ? 'Verified Professional' : 'System Administrator'}
                          </span>
                        </div>

                        {/* Customer Dropdown Links */}
                        {user.role === 'customer' && (
                          <>
                            <Link
                              to="/customer/dashboard"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition"
                            >
                              <User className="w-4 h-4 text-slate-500" />
                              <span>Customer Dashboard</span>
                            </Link>
                            <Link
                              to="/customer/my-jobs"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition"
                            >
                              <Briefcase className="w-4 h-4 text-slate-500" />
                              <span>My Jobs</span>
                            </Link>
                            <Link
                              to="/customer/bookings"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition"
                            >
                              <Check className="w-4 h-4 text-slate-500" />
                              <span>Bookings</span>
                            </Link>
                            <Link
                              to="/customer/messages"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center justify-between px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <MessageSquare className="w-4 h-4 text-slate-500" />
                                <span>Messages</span>
                              </div>
                              {unreadMessages > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                  {unreadMessages}
                                </span>
                              )}
                            </Link>
                            <Link
                              to="/customer/notifications"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center justify-between px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <Bell className="w-4 h-4 text-slate-500" />
                                <span>Notifications</span>
                              </div>
                              {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                                  {unreadCount}
                                </span>
                              )}
                            </Link>
                            <Link
                              to="/customer/profile"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition"
                            >
                              <Settings className="w-4 h-4 text-slate-500" />
                              <span>Account Profile</span>
                            </Link>
                          </>
                        )}

                        {/* Vendor Dropdown Links (Organized by 4 Groups) */}
                        {user.role === 'vendor' && (
                          <div className="py-1">
                            {/* Work Management */}
                            <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Work Management
                            </div>
                            <Link
                              to="/vendor/responses"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/responses'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <FileText className="w-4 h-4 text-slate-500" />
                                <span>My Offers</span>
                              </div>
                            </Link>
                            <Link
                              to="/vendor/bookings"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/bookings'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <span>Confirmed Jobs</span>
                              </div>
                            </Link>
                            <Link
                              to="/vendor/active-jobs"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/active-jobs'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Briefcase className="w-4 h-4 text-slate-500" />
                                <span>Current Work</span>
                              </div>
                            </Link>
                            <Link
                              to="/vendor/calendar"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/calendar'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <CalendarDays className="w-4 h-4 text-slate-500" />
                                <span>Calendar & Availability</span>
                              </div>
                            </Link>

                            <div className="my-1.5 border-t border-slate-100" />

                            {/* Business */}
                            <div className="px-4 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Business
                            </div>
                            <Link
                              to="/vendor/services"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/services'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Wrench className="w-4 h-4 text-slate-500" />
                                <span>My Services</span>
                              </div>
                            </Link>
                            <Link
                              to="/vendor/earnings"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/earnings'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <DollarSign className="w-4 h-4 text-slate-500" />
                                <span>Earnings After Fees</span>
                              </div>
                            </Link>
                            <Link
                              to="/vendor/reviews"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/reviews'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Star className="w-4 h-4 text-slate-500" />
                                <span>Reviews & Ratings</span>
                              </div>
                            </Link>
                            <Link
                              to="/vendor/verification"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/verification'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <ShieldCheck className="w-4 h-4 text-slate-500" />
                                <span>Profile Completion</span>
                              </div>
                            </Link>

                            <div className="my-1.5 border-t border-slate-100" />

                            {/* Communication */}
                            <div className="px-4 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Communication
                            </div>
                            <Link
                              to="/vendor/messages"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/messages'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <MessageSquare className="w-4 h-4 text-slate-500" />
                                <span>Messages</span>
                              </div>
                              {unreadMessages > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                  {unreadMessages}
                                </span>
                              )}
                            </Link>
                            <Link
                              to="/vendor/notifications"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/notifications'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Bell className="w-4 h-4 text-slate-500" />
                                <span>Notifications</span>
                              </div>
                              {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                                  {unreadCount}
                                </span>
                              )}
                            </Link>

                            <div className="my-1.5 border-t border-slate-100" />

                            {/* Account */}
                            <div className="px-4 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Account
                            </div>
                            <Link
                              to="/vendor/profile"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/profile'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <User className="w-4 h-4 text-slate-500" />
                                <span>My Profile</span>
                              </div>
                            </Link>
                            <Link
                              to="/vendor/settings"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/settings'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Settings className="w-4 h-4 text-slate-500" />
                                <span>Settings</span>
                              </div>
                            </Link>
                            <Link
                              to="/vendor/support"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center justify-between px-4 py-2 text-xs transition ${
                                routerLocation.pathname === '/vendor/support'
                                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <HelpCircle className="w-4 h-4 text-slate-500" />
                                <span>Help & Support</span>
                              </div>
                            </Link>
                          </div>
                        )}

                        {/* Admin Dropdown Links */}
                        {user.role === 'admin' && (
                          <>
                            <Link
                              to="/admin/dashboard"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition"
                            >
                              <ShieldCheck className="w-4 h-4 text-slate-500" />
                              <span>Admin Dashboard</span>
                            </Link>
                            <Link
                              to="/admin/vendors"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition"
                            >
                              <User className="w-4 h-4 text-slate-500" />
                              <span>Verify Vendors</span>
                            </Link>
                            <Link
                              to="/admin/jobs"
                              onClick={() => setUserDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 hover:text-emerald-800 transition"
                            >
                              <Briefcase className="w-4 h-4 text-slate-500" />
                              <span>Manage Jobs</span>
                            </Link>
                          </>
                        )}

                        <div className="my-1 border-t border-slate-100" />

                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-700 hover:bg-rose-50 text-left font-medium transition"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
                  {/* Sign In */}
                  <Link
                    to="/login"
                    className="h-9 inline-flex items-center px-2.5 xl:px-3 rounded-lg text-xs xl:text-sm font-semibold text-slate-700 hover:text-[#06684F] hover:bg-slate-100 transition whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                  >
                    Sign In
                  </Link>

                  {/* Join as a Vendor (Full button on >= 1200px) */}
                  <Link
                    to="/register?role=vendor"
                    className="hidden xl:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border border-[#06684F] text-[#06684F] hover:bg-[#06684F]/5 transition whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Join as a Vendor</span>
                  </Link>

                  {/* Request a Service (Primary Action) */}
                  <button
                    type="button"
                    onClick={onOpenPostJob || (() => navigate('/customer/create-job'))}
                    className="h-9 inline-flex items-center gap-1.5 px-3 xl:px-3.5 rounded-lg bg-[#06684F] hover:bg-[#055742] text-white text-xs xl:text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Request a Service</span>
                  </button>

                  {/* Sign Up (Full button on >= 1200px) */}
                  <Link
                    to="/register"
                    className="hidden xl:inline-flex items-center h-9 px-3.5 rounded-lg text-xs xl:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    Sign Up
                  </Link>

                  {/* Compact Secondary Menu for Tablet (768px - 1199px) */}
                  <div className="relative xl:hidden shrink-0" ref={tabletMenuRef}>
                    <button
                      type="button"
                      onClick={() => setTabletMenuOpen(!tabletMenuOpen)}
                      className="h-9 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition shrink-0 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
                      title="More Options"
                      aria-label="More Options"
                      aria-expanded={tabletMenuOpen}
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${tabletMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {tabletMenuOpen && (
                      <div 
                        role="menu"
                        className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs divide-y divide-slate-100"
                      >
                        <div className="py-1">
                          <Link
                            to="/register?role=vendor"
                            onClick={() => setTabletMenuOpen(false)}
                            className="flex items-center gap-2 px-3.5 py-2 text-[#06684F] hover:bg-emerald-50 font-semibold transition"
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>Join as a Vendor</span>
                          </Link>
                          <Link
                            to="/register"
                            onClick={() => setTabletMenuOpen(false)}
                            className="flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-50 font-semibold transition"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>Sign Up</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── MOBILE BAR: Fast Controls for Screens < 768px ── */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onSearchTrigger || (() => navigate(user?.role === 'vendor' ? '/vendor/browse-jobs' : '/professionals'))}
                className="h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-[#06684F] hover:bg-slate-100 rounded-lg transition"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>

              {!user || user.role === 'customer' ? (
                <button
                  type="button"
                  onClick={onOpenPostJob || (() => navigate('/customer/create-job'))}
                  className="h-8 px-2.5 rounded-lg bg-[#06684F] hover:bg-[#055742] text-white text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-3 h-3" />
                  <span>Request</span>
                </button>
              ) : user.role === 'vendor' ? (
                <Link
                  to="/vendor/dashboard"
                  className="h-8 px-2.5 rounded-lg bg-[#06684F] hover:bg-[#055742] text-white text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition active:scale-95 whitespace-nowrap"
                >
                  <Briefcase className="w-3 h-3" />
                  <span>Dashboard</span>
                </Link>
              ) : (
                <Link
                  to="/admin/dashboard"
                  className="h-8 px-2.5 rounded-lg bg-[#06684F] hover:bg-[#055742] text-white text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition active:scale-95 whitespace-nowrap"
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>Admin</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle Navigation Menu"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-700 hover:text-[#06684F] hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#06684F] transition shrink-0"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* ── DESKTOP EXPLORE SERVICES MEGA MENU ── */}
        {megaMenuOpen && (
          <div
            ref={megaMenuContainerRef}
            onMouseEnter={() => {
              if (megaMenuTimeoutRef.current) clearTimeout(megaMenuTimeoutRef.current);
            }}
            onMouseLeave={() => {
              megaMenuTimeoutRef.current = setTimeout(() => {
                setMegaMenuOpen(false);
              }, 200);
            }}
            className="hidden lg:block absolute top-full left-1/2 -translate-x-1/2 w-[min(1240px,calc(100vw-2rem))] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150 before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-['']"
            role="dialog"
            aria-label="Explore Services Menu"
          >
            <div className="p-6 lg:p-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {megaMenuGroups.map((group) => {
                  return (
                    <div key={group.id} className="space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <span className="w-2 h-2 rounded-full bg-[#06684F]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                          {group.title}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-semibold ml-auto">
                          {group.items.length}
                        </span>
                      </div>

                      {group.items.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-2">No matching services</p>
                      ) : (
                        <div className="space-y-0.5">
                          {group.items.map((cat) => {
                            const IconComp = MEGA_MENU_ICONS[cat.icon] || Wrench;
                            return (
                              <Link
                                key={cat.slug}
                                to={`/professionals?category=${encodeURIComponent(cat.slug)}`}
                                onClick={() => setMegaMenuOpen(false)}
                                className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-700 hover:text-[#06684F] hover:bg-emerald-50/70 transition-colors text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#06684F]"
                              >
                                <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-[#06684F] flex items-center justify-center shrink-0 transition-colors">
                                  <IconComp className="w-3.5 h-3.5" />
                                </div>
                                <span className="truncate">{cat.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mega Menu Footer */}
            <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-3.5 lg:px-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Quick search service by name..."
                  value={megaMenuSearch}
                  onChange={(e) => setMegaMenuSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && megaMenuSearch.trim()) {
                      setMegaMenuOpen(false);
                      navigate(`/categories?search=${encodeURIComponent(megaMenuSearch.trim())}`);
                    }
                  }}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-[#111827] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#06684F]"
                />
                {megaMenuSearch && (
                  <button
                    type="button"
                    onClick={() => setMegaMenuSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                    aria-label="Clear service search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-slate-500 text-[11px] hidden md:inline">
                  Browse all 30 canonical service categories
                </span>
                <Link
                  to="/categories"
                  onClick={() => setMegaMenuOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06684F] hover:bg-[#055742] text-white font-semibold text-xs shadow-2xs transition active:scale-95"
                >
                  <span>View All Services</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── MOBILE: Collapsible Drawer ── */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-6 space-y-4 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-top-2 duration-200"
            role="dialog"
            aria-label="Mobile Navigation Menu"
          >
            {/* Mobile Location Selector Bar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Location</span>
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  className="text-emerald-800 flex items-center gap-1 font-medium hover:underline"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  <span>Locate Me</span>
                </button>
              </div>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-800 text-sm font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#06684F]"
              >
                {POPULAR_LOCATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Navigation Links */}
            <nav className="space-y-1">
              {navLinks.map((link) => {
                const isExplore = link.label === 'Explore Services';
                const isActive = link.to === '/' 
                  ? routerLocation.pathname === '/' 
                  : routerLocation.pathname === link.to || routerLocation.pathname.startsWith(link.to + '/');

                if (isExplore) {
                  return (
                    <div key={link.to} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Link
                          to={link.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex-1 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                            isActive
                              ? 'bg-emerald-50 text-[#06684F] font-semibold border border-emerald-200/60'
                              : 'text-slate-800 hover:bg-slate-100 hover:text-[#06684F]'
                          }`}
                        >
                          {link.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setMobileExploreExpanded((prev) => !prev)}
                          className="p-2.5 text-slate-500 hover:text-[#06684F]"
                          aria-label="Toggle explore services categories"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              mobileExploreExpanded ? 'rotate-180 text-[#06684F]' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {mobileExploreExpanded && (
                        <div className="pl-3 pr-2 py-2 space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                          {megaMenuGroups.map((group) => (
                            <div key={group.id} className="space-y-1">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                {group.title}
                              </p>
                              <div className="grid grid-cols-1 gap-1">
                                {group.items.slice(0, 4).map((cat) => (
                                  <Link
                                    key={cat.slug}
                                    to={`/professionals?category=${encodeURIComponent(cat.slug)}`}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-xs text-slate-700 hover:text-[#06684F] py-1 flex items-center gap-2"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#06684F]" />
                                    <span>{cat.name}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                          <Link
                            to="/categories"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-center text-xs font-bold text-[#06684F] pt-2 border-t border-slate-200"
                          >
                            View All Services Catalogue →
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                }

                const isEmergency = link.isEmergency || link.label === 'Emergency';
                if (isEmergency) {
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                        isActive
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                          : 'bg-rose-50 text-rose-700 border border-rose-200/90 hover:bg-rose-100 hover:text-rose-800'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                      <span>{link.label}</span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-emerald-50 text-[#06684F] font-semibold border border-emerald-200/60'
                        : 'text-slate-800 hover:bg-slate-100 hover:text-[#06684F]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Auth Actions */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <img
                      src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                      alt={user.name}
                      className="w-9 h-9 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{user.role} Account</p>
                    </div>
                  </div>

                  {user.role === 'customer' && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          if (onOpenPostJob) onOpenPostJob();
                          else navigate('/customer/create-job');
                        }}
                        className="block w-full text-center px-4 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm transition shadow-sm"
                      >
                        + Request a Service
                      </button>
                      <Link
                        to="/customer/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block w-full text-center px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-sm transition"
                      >
                        Customer Dashboard
                      </Link>
                      <Link
                        to="/customer/notifications"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium text-sm transition"
                      >
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-slate-500" />
                          <span>Notifications</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    </div>
                  )}

                  {user.role === 'vendor' && (
                    <div className="space-y-2">
                      <Link
                        to="/vendor/browse-jobs"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block w-full text-center px-4 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm transition shadow-sm"
                      >
                        Find Available Jobs
                      </Link>
                      <Link
                        to="/vendor/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block w-full text-center px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-sm transition"
                      >
                        Professional Dashboard
                      </Link>

                      {/* Mobile Quick Links for Vendor */}
                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                        <Link
                          to="/vendor/responses"
                          onClick={() => setMobileMenuOpen(false)}
                          className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 text-center"
                        >
                          My Offers
                        </Link>
                        <Link
                          to="/vendor/bookings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 text-center"
                        >
                          Confirmed Jobs
                        </Link>
                        <Link
                          to="/vendor/services"
                          onClick={() => setMobileMenuOpen(false)}
                          className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 text-center"
                        >
                          My Services
                        </Link>
                        <Link
                          to="/vendor/earnings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 text-center"
                        >
                          Earnings After Fees
                        </Link>
                        <Link
                          to="/vendor/notifications"
                          onClick={() => setMobileMenuOpen(false)}
                          className="col-span-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Bell className="w-3.5 h-3.5 text-slate-500" />
                            <span>Notifications</span>
                          </div>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                              {unreadCount}
                            </span>
                          )}
                        </Link>
                      </div>
                    </div>
                  )}

                  {user.role === 'admin' && (
                    <div className="space-y-2">
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block w-full text-center px-4 py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm transition shadow-sm"
                      >
                        Admin Console
                      </Link>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full text-center px-4 py-2.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium text-sm transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenPostJob) onOpenPostJob();
                      else navigate('/customer/create-job');
                    }}
                    className="flex items-center justify-center gap-2 w-full text-center px-4 py-2.5 rounded-lg bg-[#06684F] hover:bg-[#055742] text-white font-semibold text-sm transition shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Request a Service</span>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-100 font-medium text-sm transition"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center px-3.5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition"
                    >
                      Sign Up
                    </Link>
                  </div>
                  <Link
                    to="/register?role=vendor"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 w-full text-center px-3.5 py-2.5 rounded-lg border border-[#06684F] text-[#06684F] hover:bg-[#06684F]/5 font-semibold text-sm transition"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Join as a Vendor</span>
                  </Link>
                </div>
              )}
            </div>

          </div>
        )}
      </header>
    </>
  );
}
