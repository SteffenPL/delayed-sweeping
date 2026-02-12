import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfigButtons } from './ConfigButtons';
import { SimulationTab } from './SimulationTab';
import { ConstraintTab } from './ConstraintTab';
import { TrajectoryTab } from './TrajectoryTab';
import { AppearanceTab } from './AppearanceTab';

export function ParameterPanel() {
  return (
    <Card className="w-full lg:w-[360px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Parameters</CardTitle>
          <ConfigButtons />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="simulation" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="simulation">Simulation</TabsTrigger>
            <TabsTrigger value="constraint">Constraint</TabsTrigger>
            <TabsTrigger value="trajectory">Trajectory</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>
          <TabsContent value="simulation" className="mt-4">
            <SimulationTab />
          </TabsContent>
          <TabsContent value="constraint" className="mt-4">
            <ConstraintTab />
          </TabsContent>
          <TabsContent value="trajectory" className="mt-4">
            <TrajectoryTab />
          </TabsContent>
          <TabsContent value="appearance" className="mt-4">
            <AppearanceTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
