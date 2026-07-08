import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Bell, Shield, ClipboardList, BookOpen, HelpCircle, Palette, Check, Sparkles, Repeat, Briefcase, Building2 } from "lucide-react";
import { useRealAuth } from '@/contexts/RealAuthContext';
import { useWhiteLabel, BrandColorTheme } from '@/contexts/WhiteLabelContext';
import { useSmsPlan } from '@/hooks/useSmsPlan';
import { useCompanyHasSST } from '@/hooks/useCompanyHasSST';
import CompanySwitcher from '@/components/CompanySwitcher';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const COLOR_OPTIONS: { value: BrandColorTheme; label: string; color: string }[] = [
  { value: 'green', label: 'Verde', color: '#166534' },
];

const SMS_LOGO_URL = '/__l5e/assets-v1/86052a62-59f9-47bf-af09-bc2d67c91278/sr-sms-logo.png';

interface NavbarProps {
  smsBrand?: boolean;
}

const Navbar = ({ smsBrand = false }: NavbarProps) => {
  const { user, role, availableRoles, switchRole, signOut, profile } = useRealAuth();
  const hasDualRole = availableRoles.includes('sst') && availableRoles.includes('company');
  const { brandLogo, isWhiteLabel, brandColor, isLoading: isBrandLoading, setBrandColorDB } = useWhiteLabel();
  const { isSmsPlan } = useSmsPlan();
  const { resetTour: resetSstTour } = useOnboarding('sst-dashboard');
  const { resetTour: resetCompanyTour } = useOnboarding('company-dashboard');
  const isLoggedIn = !!user;
  const location = useLocation();

  const isSmsRoute = smsBrand
    || location.pathname.startsWith('/sms')
    || location.pathname === '/teste-gratis-sst'
    || (isLoggedIn && isSmsPlan);

  const handleResetTour = () => {
    if (role === 'sst') {
      resetSstTour();
    } else {
      resetCompanyTour();
    }
    toast.success('Tutorial reiniciado! Navegue pelas páginas para revê-lo.');
  };

  const handleColorChange = async (color: BrandColorTheme) => {
    await setBrandColorDB(color);
    toast.success('Esquema de cores atualizado!');
  };

  const getDashboardPath = () => {
    if (!role) return '/';
    switch (role) {
      case 'admin': return '/master-dashboard';
      case 'sst': return '/sst-dashboard';
      case 'company': return '/dashboard';
      case 'partner': return '/partner-dashboard';
      case 'affiliate': return '/afiliado/dashboard';
      case 'sales': return '/sales-dashboard';
      default: return '/';
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="audit-container">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to={isLoggedIn ? getDashboardPath() : '/'} className="flex items-center gap-3">
              {isSmsRoute ? (
                <img 
                  src={SMS_LOGO_URL} 
                  alt="Sr. SMS" 
                  className="h-8 object-contain"
                />
              ) : isLoggedIn && isBrandLoading ? (
                <div className="h-10 w-28 rounded-md bg-muted animate-pulse" aria-label="Carregando marca" />
              ) : isWhiteLabel && brandLogo ? (
                <img 
                  src={brandLogo} 
                  alt="Logo" 
                  className="h-10 object-contain"
                />
              ) : (
                <img 
                  src="/lovable-uploads/Logo_SOIA.png" 
                  alt="SOIA Logo" 
                  className="h-8"
                />
              )}
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
              {hasDualRole && (role === 'sst' || role === 'company') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => switchRole(role === 'sst' ? 'company' : 'sst')}
                  className="gap-2 font-semibold shadow-sm"
                  title={role === 'sst' ? 'Mudar para visão de Empresa' : 'Mudar para visão de Gestora SST'}
                >
                  {role === 'sst' ? <Building2 className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                  <span>
                    {role === 'sst' ? 'Ver como Empresa' : 'Ver como Gestora SST'}
                  </span>
                  <Repeat className="h-3.5 w-3.5 opacity-70" />
                </Button>
              )}
              {role === 'sst' && (
                <div className="flex items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Esquema de cores"
                      >
                        <Palette className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-3" align="end">
                      <p className="text-sm font-medium mb-3">Esquema de cores</p>
                      <div className="grid grid-cols-2 gap-2">
                        {COLOR_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleColorChange(opt.value)}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-left"
                          >
                            <div
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: opt.color }}
                            >
                              {(brandColor || 'green') === opt.value && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span className="text-xs font-medium">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Link to="/sst-portal">
                    <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-2 border-primary/30 text-primary hover:bg-primary/5">
                      <BookOpen className="h-4 w-4" />
                      Portal do Parceiro
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={handleResetTour}
                    title="Rever tutorial"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {role === 'company' && (
                <>
                  <CompanySwitcher />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={handleResetTour}
                    title="Rever tutorial"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive"></span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-3">
                      <div className="hidden md:block text-sm text-right">
                        <div className="font-medium">{profile?.full_name || 'Usuário'}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-audit-accent flex items-center justify-center text-white">
                        {(profile?.full_name || 'U').substring(0, 2).toUpperCase()}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {role === 'admin' && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/master-dashboard" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Painel Admin
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/user-management" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Gestão de Usuários
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/climate-dashboard" className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            Pesquisa de Clima
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {role === 'company' && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard">Dashboard</Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {role === 'sst' && (
                      <DropdownMenuItem asChild>
                        <Link to="/sst-dashboard">Dashboard SST</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/profile">Perfil</Link>
                    </DropdownMenuItem>
                    {(role === 'company' || role === 'sst') && (
                      <DropdownMenuItem asChild>
                        <Link to="/financeiro">Financeiro</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-4">
                {!isSmsRoute && (
                  <>
                    <a href="/#sistema-nr01" className="hidden md:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Soluções
                    </a>
                    <a href="/#beneficios" className="hidden md:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Benefícios
                    </a>
                    <a href="/#faq" className="hidden lg:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      FAQ
                    </a>
                    <a href="/#contato" className="hidden sm:inline-flex">
                      <Button variant="ghost">
                        Contato
                      </Button>
                    </a>
                  </>
                )}
                <Link to={isSmsRoute ? '/sms/auth' : '/auth'}>
                  <Button className="bg-audit-primary hover:bg-audit-primary/90">
                    Área do Cliente
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
