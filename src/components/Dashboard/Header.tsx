import React from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../ui/button";

const Header = () => {
  const year = new Date().getFullYear();
  const { signOut } = useAuth();

  return (
    <header className="flex items-center justify-between gap-3 border-b bg-white px-4 py-2">
      <div className="flex flex-col items-center">
        <img
          src="/images/logo_header.png"
          alt="Climformatics"
          width={128}
          height={36}
          className="h-9 w-auto"
        />
        <span className="mt-0.5 text-[10px] text-gray-500">
          © {year} Climformatics
        </span>
      </div>

      <div className="flex shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          onClick={() => void signOut()}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
      </div>
    </header>
  );
};

export default Header;
