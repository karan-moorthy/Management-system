import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { PriorityBreakdownClient } from "./client";

const PriorityBreakdownPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <PriorityBreakdownClient />;
};

export default PriorityBreakdownPage;
