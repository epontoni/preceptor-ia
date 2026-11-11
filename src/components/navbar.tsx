// src/components/navbar.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  Users,
  UserPlus,
  Bot,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();
  if (pathname?.startsWith('/firmar')) {
    return null;
  }

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Buscador & Legajos', icon: Users },
    { href: '/inscripcion', label: 'Nueva Inscripción', icon: UserPlus },
    { href: '/asistente', label: 'Asistente IA', icon: Bot, isNew: true },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Identidad Institucional */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-foreground flex items-center gap-1">
                  preceptor<span className="text-primary font-extrabold">.ia</span>
                </span>
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase -mt-1">
                  IPETYM 256
                </span>
              </div>
            </Link>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all',
                    isActive
                      ? 'bg-secondary text-primary font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span>{item.label}</span>
                  {item.isNew && (
                    <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-4">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" /> IA
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Trigger */}
          <div className="flex items-center gap-2.5">
            {/* Mobile Menu Sheet */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menú</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                  <SheetHeader className="text-left mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <SheetTitle className="text-base font-bold">preceptor.ia</SheetTitle>
                        <p className="text-xs text-muted-foreground">IPETYM 256 - Leones (Cba.)</p>
                      </div>
                    </div>
                  </SheetHeader>

                  <div className="flex flex-col gap-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground font-semibold'
                              : 'text-foreground hover:bg-muted'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.isNew && (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-4">
                              IA
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>

                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
