import React from 'react';

const AttendanceSimplifierPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <iframe
        src="/attendance-simplifier.html"
        title="Attendance Simplifier"
        className="w-full min-h-[calc(100vh-2rem)] border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
};

export default AttendanceSimplifierPage;
