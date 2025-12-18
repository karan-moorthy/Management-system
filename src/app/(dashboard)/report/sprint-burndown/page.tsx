import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { SprintBurndownClient } from "./client";

const SprintBurndownPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <SprintBurndownClient />;
};

export default SprintBurndownPage;
