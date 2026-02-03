import { Button } from "../components/ui/button";

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-primary/80">
            Configure how Your Gym Mate keeps your data safe and portable.
          </p>
        </div>
      </header>

      <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Backup & Restore
              </h2>
              <p className="text-sm text-gray-600">
                Export your workout data as CSV or import a file you previously
                exported.
              </p>
            </div>
            <Button size="sm" variant="ghost">
              Coming soon
            </Button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            The backup tools will surface in this space shortly. While the rest
            of the Settings page stays light for now, you can navigate the app
            and check for updates through the bottom navigation.
          </p>
        </section>
      </main>
    </div>
  );
}
