import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { JiraDashboard } from "@/components/jira-dashboard";

const DashboardPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      <JiraDashboard />
    </div>
  );
};

export default DashboardPage;
