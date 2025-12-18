import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { StatusOverviewClient } from "./client";

const StatusOverviewPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <StatusOverviewClient />;
};

export default StatusOverviewPage;
