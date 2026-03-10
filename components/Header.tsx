import Link from "next/link";

export default function Header() {
  const navItems = [
    { label: "Players", href: "/" },
    { label: "New Match", href: "/new-match" },
    { label: "History", href: "/history" },
  ];

  return (
    <header className="border-retro border-retro-width p-4 rounded-retro bg-retro-dark shadow-retro-outset">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-retro-green to-retro-blue flex items-center justify-center">
            <span className="text-retro-dark font-pixel text-lg">P</span>
          </div>
          <h1 className="text-2xl font-pixel text-retro-green">
            POKER<span className="text-retro-yellow">WISE</span>
          </h1>
          <div className="hidden md:block text-retro-gray text-sm ml-4">
            <span className="px-2 py-1 bg-retro-dark border border-retro-gray rounded">
              Local-first • 16-bit • Texas Hold&apos;em
            </span>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 border border-retro-gray rounded-retro bg-retro-dark text-retro-light hover:bg-retro-green hover:text-retro-dark hover:border-retro-green transition-all duration-200 font-pixel text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-4 text-center text-retro-gray text-sm">
        <p>
          Fixed buy‑ins • Rebuys anytime • Final chip value entry • Auto‑settlement
        </p>
      </div>
    </header>
  );
}