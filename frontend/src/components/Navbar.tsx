import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar = function(): React.ReactElement {
  const { pathname } = useLocation();
  const [activeSection, setActiveSection] = useState(window.location.hash.slice(1) || 'home');
  const isProgrammaticScroll = useRef(false);
  const scrollEndTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (pathname !== '/') {
      return;
    }

    const updateActiveSection = () => {
      if (isProgrammaticScroll.current) {
        return;
      }

      const sectionIds = ['home', 'facilities', 'contact'];
      const currentSection = sectionIds.reduce((activeId, sectionId) => {
        const section = document.getElementById(sectionId);
        if (section && section.offsetTop <= window.scrollY + 120) {
          return sectionId;
        }
        return activeId;
      }, 'home');

      setActiveSection(currentSection);
    };

    const finishProgrammaticScroll = () => {
      isProgrammaticScroll.current = false;
      updateActiveSection();
    };

    const handleSectionClick = (event: MouseEvent) => {
      const link = event.currentTarget as HTMLAnchorElement;
      const sectionId = link.hash.slice(1);
      const section = document.getElementById(sectionId);

      if (!section) {
        return;
      }

      event.preventDefault();
      setActiveSection(sectionId);
      isProgrammaticScroll.current = true;
      window.history.pushState(null, '', link.href);
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });

      window.clearTimeout(scrollEndTimeout.current);
      scrollEndTimeout.current = window.setTimeout(finishProgrammaticScroll, 1000);
    };

    const updateFromHash = () => {
      const sectionId = window.location.hash.slice(1);
      if (sectionId && ['home', 'facilities', 'contact'].includes(sectionId)) {
        setActiveSection(sectionId);
      }
    };

    const sectionLinks = document.querySelectorAll<HTMLAnchorElement>('nav a[href*="#"]');
    sectionLinks.forEach((link) => link.addEventListener('click', handleSectionClick));
    window.addEventListener('scroll', updateActiveSection);
    window.addEventListener('hashchange', updateFromHash);
    window.addEventListener('scrollend', finishProgrammaticScroll);
    updateActiveSection();

    return () => {
      sectionLinks.forEach((link) => link.removeEventListener('click', handleSectionClick));
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('hashchange', updateFromHash);
      window.removeEventListener('scrollend', finishProgrammaticScroll);
      window.clearTimeout(scrollEndTimeout.current);
    };
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-[#F5EBE6] px-4 py-4 shadow-sm sm:px-8 md:px-12 md:py-6">
      <div className="shrink-0 font-serif text-lg font-bold text-[#4A3B32] sm:text-xl">
        Kost Camp M2
      </div>
      <div className="flex items-center gap-3 text-sm font-medium text-[#4A3B32] sm:gap-5 md:gap-8 md:text-base">

        <a
          href="/#home"
          className={`hover:text-amber-800 transition ${pathname === '/' && activeSection === 'home' ? 'font-bold border-b-2 border-[#4A3B32]' : ''}`}
        >
          Home
        </a>

        <a
          href="/#facilities"
          className={`hover:text-amber-800 transition ${pathname === '/' && activeSection === 'facilities' ? 'font-bold border-b-2 border-[#4A3B32]' : ''}`}
        >
          Facilities
        </a>

        <a
          href="/#contact"
          className={`hover:text-amber-800 transition ${pathname === '/' && activeSection === 'contact' ? 'font-bold border-b-2 border-[#4A3B32]' : ''}`}
        >
          Contact Us
        </a>

        <Link
          to="/login"
          className="rounded-md bg-[#5C4033] px-3 py-2 text-white shadow transition hover:bg-[#4A3B32] sm:px-5"
        >
          Log In
        </Link>
      </div>
    </nav>
  );
};