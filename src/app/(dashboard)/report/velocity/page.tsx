import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { VelocityClient } from "./client";

const VelocityPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  return <VelocityClient />;
};

export default VelocityPage;
