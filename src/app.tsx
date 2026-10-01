import { useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SiteLayout } from "./components/site-layout";
import { AuditPage } from "./pages/audit-page";
import { HomePage } from "./pages/home-page";
import { MethodologyPage, NotFoundPage, PrivacyPage } from "./pages/information-pages";
import { PreparationPage } from "./pages/preparation-page";
import { CareerProfilePage } from "./pages/career-profile-page";
import { LatexResumePage } from "./pages/latex-resume-page";
import { GithubReadmePage } from "./pages/github-readme-page";
import { RepositoryDetailPage } from "./pages/repository-detail-page";
import { LinkedInReviewPage } from "./pages/linkedin-review-page";
import { RestoreProfilePage } from "./pages/restore-profile-page";

function createAppRouter() {
  return createBrowserRouter([
    {
      path: "/",
      element: <SiteLayout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "audit", element: <AuditPage /> },
        { path: "audit/:username", element: <AuditPage /> },
        { path: "audit/:username/repositories/:owner/:repo", element: <RepositoryDetailPage /> },
        { path: "audit/:username/prepare", element: <PreparationPage /> },
        { path: "career/:username", element: <CareerProfilePage /> },
        { path: "career/:username/resume", element: <LatexResumePage /> },
        { path: "career/:username/readme", element: <GithubReadmePage /> },
        { path: "career/:username/linkedin-review", element: <LinkedInReviewPage /> },
        { path: "methodology", element: <MethodologyPage /> },
        { path: "privacy", element: <PrivacyPage /> },
        { path: "restore", element: <RestoreProfilePage /> },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ], { future: { v7_startTransition: true } });
}

export function App() {
  const [router] = useState(createAppRouter);
  return <RouterProvider router={router} />;
}
