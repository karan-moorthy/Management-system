import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { CycleTimeClient } from "./client";

const CycleTimePage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <CycleTimeClient />;
};

export default CycleTimePage;
