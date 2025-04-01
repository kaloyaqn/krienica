import { useState } from 'react';
import dynamic from 'next/dynamic';
import RoleSelector from '../components/RoleSelector';

// Dynamically import the Map component with no SSR
const Map = dynamic(() => import('../components/Map'), { ssr: false });

export default function Home() {
  const [zones, setZones] = useState([]);
  const [userRole, setUserRole] = useState(null);

  const handleZoneCreated = (coordinates) => {
    setZones(prev => [...prev, coordinates]);
  };

  const handleCancel = () => {
    // Handle cancel logic
  };

  return (
    <div className="h-screen w-screen">
      <RoleSelector onRoleSelected={setUserRole} />
      {userRole && (
        <Map
          zones={zones}
          onZoneCreated={handleZoneCreated}
          onCancel={handleCancel}
          userRole={userRole}
        />
      )}
    </div>
  );
} 