import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { CumulativeFlowClient } from "./client";

const CumulativeFlowPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <CumulativeFlowClient />;
};

export default CumulativeFlowPage;
