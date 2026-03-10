import { requireAdmin } from "@/server/auth/session";

export default async function AdminPage() {
  const session = await requireAdmin();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-pixel text-retro-green mb-4">ADMIN DASHBOARD</h1>
      <div className="border border-retro-gray rounded-retro p-6 bg-retro-dark">
        <p className="text-retro-light mb-2">
          Welcome, <span className="text-retro-yellow">{session.email}</span>.
        </p>
        <p className="text-retro-gray text-sm">
          This is a placeholder for future admin features (groups, matches, etc.).
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-retro-gray rounded-retro p-4">
            <h2 className="font-pixel text-retro-yellow mb-2">Groups</h2>
            <p className="text-sm text-retro-gray">Manage poker groups</p>
          </div>
          <div className="border border-retro-gray rounded-retro p-4">
            <h2 className="font-pixel text-retro-yellow mb-2">Matches</h2>
            <p className="text-sm text-retro-gray">View and settle matches</p>
          </div>
          <div className="border border-retro-gray rounded-retro p-4">
            <h2 className="font-pixel text-retro-yellow mb-2">Players</h2>
            <p className="text-sm text-retro-gray">Manage recurring players</p>
          </div>
        </div>
        <div className="mt-8">
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="px-4 py-2 border border-retro-red rounded-retro text-retro-red font-pixel hover:bg-retro-red hover:text-retro-dark transition-colors"
            >
              LOGOUT
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}