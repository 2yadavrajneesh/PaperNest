"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FileStack, Menu, Moon, Sun, X, ChevronDown } from "lucide-react";
import { categories } from "@/lib/tools";

export function SiteHeader() {
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("papernest-theme");
    const shouldDark = saved === "dark";
    setDark(shouldDark);
    document.documentElement.classList.toggle("dark", shouldDark);
  }, []);

  useEffect(() => {
    function closeDropdown(event: MouseEvent) {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setToolsOpen(false);
    }
    document.addEventListener("mousedown", closeDropdown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeDropdown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("papernest-theme", next ? "dark" : "light");
  }

  return (
    <header className="site-header">
      <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="brand-lockup" aria-label="PaperNest home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><FileStack size={22} strokeWidth={2.3} /></span>
          <span className="brand-name">paper<span>nest</span></span>
        </Link>

        <div className="flex items-center gap-2.5">
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <div ref={toolsDropdownRef} className="nav-dropdown explore-tools-dropdown relative hidden sm:block">
            <button
              className="explore-tools-button inline-flex items-center gap-2"
              type="button"
              aria-haspopup="menu"
              aria-expanded={toolsOpen}
              aria-controls="explore-tools-menu"
              onClick={() => setToolsOpen((open) => !open)}
            >
              Explore tools <ChevronDown size={16} className={toolsOpen ? "rotate-180" : ""} />
            </button>
            <div id="explore-tools-menu" role="menu" aria-label="Explore PDF tools" className={`nav-dropdown-panel explore-tools-panel ${toolsOpen ? "is-open" : ""}`}>
              <a role="menuitem" className="nav-dropdown-link" href="/#tools" onClick={() => setToolsOpen(false)}>All PDF tools</a>
              {categories.map((category) => (
                <a role="menuitem" key={category} className="nav-dropdown-link" href={`/#${category.toLowerCase().replaceAll(" ", "-")}`} onClick={() => setToolsOpen(false)}>{category}</a>
              ))}
            </div>
          </div>
          <button className="theme-toggle lg:hidden" type="button" onClick={() => setMenuOpen((v) => !v)} aria-label={menuOpen ? "Close menu" : "Open menu"}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="mobile-nav lg:hidden">
          <a href="/#tools" onClick={() => setMenuOpen(false)}>All PDF tools</a>
          <a href="/#organize-pdf" onClick={() => setMenuOpen(false)}>Organize PDF</a>
          <a href="/#convert-pdf" onClick={() => setMenuOpen(false)}>Convert PDF</a>
          <a href="/#edit-pdf" onClick={() => setMenuOpen(false)}>Edit PDF</a>
        </div>
      )}
    </header>
  );
}
