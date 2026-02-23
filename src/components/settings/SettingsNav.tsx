import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils/cn";

const navItems = [
  // { label: "General", to: "/settings" },
  {
    label: "Exercises",
    to: "/settings/exercises",
  },
  { label: "Backup", to: "/settings/backup" },
  // { label: "Advanced", to: "/settings/advanced" },
];

export function SettingsNav() {
  return (
    <nav aria-label="Settings sections" className="flex gap-3">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/settings"}
          className={({ isActive }) =>
            cn(
              "flex flex-1 min-w-[40px] flex-col items-center rounded-xl border p-2 text-center shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isActive
                ? "border-primary bg-primary/10 font-semibold text-primary shadow-primary/50"
                : "border-transparent bg-secondary text-secondary-foreground hover:border-secondary hover:text-secondary-foreground"
            )
          }
        >
          <p className="text-sm">{item.label}</p>
        </NavLink>
      ))}
    </nav>
  );
}
