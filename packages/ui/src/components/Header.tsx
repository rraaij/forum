import { Button } from "./ui/button";

interface HeaderProps {
  isAuthenticated: boolean;
  userName?: string | null;
  onSignOut?: () => void;
}

export function Header({ isAuthenticated, userName, onSignOut }: HeaderProps) {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold">Forum</h1>
          <nav className="flex gap-4">
            <a href="/" className="hover:underline">
              Categories
            </a>
            <a href="http://localhost:3001" className="hover:underline">
              Frontpage
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-muted-foreground">
                {userName || "User"}
              </span>
              <Button variant="outline" size="sm" onClick={onSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <a href="/auth/signin">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </a>
              <a href="/auth/signup">
                <Button size="sm">Sign Up</Button>
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
