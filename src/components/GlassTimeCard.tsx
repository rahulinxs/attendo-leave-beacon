import React, { useEffect, useState } from "react";

const GlassTimeCard: React.FC = () => {

  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  const updateClock = () => {
    const now = new Date();

    const formattedTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

    const formattedDate = now.toLocaleDateString([], {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    setTime(formattedTime);
    setDate(formattedDate);
  };

  useEffect(() => {
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (

    <div
      className="
      px-6 py-4
      rounded-2xl
      bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
      text-white
      shadow-xl
      flex flex-col items-center
      min-w-[200px]
      "
    >

      {/* Time */}
      <div className="text-2xl font-bold tracking-wide">
        {time}
      </div>

      {/* Date */}
      <div className="text-sm opacity-90 mt-1">
        {date}
      </div>

    </div>

  );
};

export default GlassTimeCard;