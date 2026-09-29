import { FOCUS_RING } from "../focus.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.js";

export const ManagerCareerScreen = () => {
  return (
    <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Career" className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-title">Career History</h1>
      <p className="mt-1 text-body text-text-secondary">
        Your complete managerial career — all clubs, competitions, and achievements.
      </p>

      <Tabs defaultValue="current" className="mt-6">
        <TabsList aria-label="Career sections">
          <TabsTrigger value="current">Current Position</TabsTrigger>
          <TabsTrigger value="summary">Career Summary</TabsTrigger>
          <TabsTrigger value="clubs">Previous Clubs</TabsTrigger>
          <TabsTrigger value="trophies">Competitions Won</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <div className="mt-4">
            <h2 className="text-heading">Current Position</h2>
            <p className="mt-1 text-body text-text-soft">Manager</p>
            <p className="text-body text-text-secondary">Current club</p>
          </div>
        </TabsContent>

        <TabsContent value="summary">
          <div className="mt-4">
            <h2 className="text-heading">Career Summary</h2>
            <p className="mt-1 text-body text-text-secondary italic">Career statistics will appear here once available.</p>
          </div>
        </TabsContent>

        <TabsContent value="clubs">
          <div className="mt-4">
            <h2 className="text-heading">Previous Clubs</h2>
            <p className="mt-1 text-body text-text-secondary italic">No previous clubs.</p>
          </div>
        </TabsContent>

        <TabsContent value="trophies">
          <div className="mt-4">
            <h2 className="text-heading">Competitions Won</h2>
            <p className="mt-1 text-body text-text-secondary italic">None yet.</p>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
};