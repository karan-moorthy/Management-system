import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { BugList } from "@/features/bugs/components/bug-list";

const BugsPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Bug Tracker</h1>
        <p className="text-muted-foreground">
          Report bugs, track issues, and manage bug fixes
        </p>
      </div>

      {/* Bug List */}
      <BugList />
    </div>
  );
};

export default BugsPage;
