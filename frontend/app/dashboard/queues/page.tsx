import { redirect } from "next/navigation";

export default function QueuesPage() {
    // Redirect to the new Session-based queue management page
    redirect("/dashboard/sessions");
}

