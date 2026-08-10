import React from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../ui/button";

const Header = () => {
  const year = new Date().getFullYear();
  const { signOut } = useAuth();

  return (
    <header className="flex items-center justify-between gap-4 border-b bg-white px-6 py-3">
      <div className="flex flex-col items-center">
        <img
          src="/images/logo_header.png"
          alt="Climformatics"
          width={160}
          height={48}
          className="h-12 w-auto"
        />
        <span className="mt-1 text-xs text-gray-500">
          © {year} Climformatics
        </span>
      </div>

      <div className="flex shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          onClick={() => void signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
};

export default Header;
