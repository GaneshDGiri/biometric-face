import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Standard styling
import '../src/App.css'; // Custom styling overrides

const CalendarView = ({ attendanceData }) => {
  
  // Function to determine class for each tile (day)
  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;

    const day = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    
    // Check if user attended this day
    const record = attendanceData.find(r => r.date === dateStr);

    if (record) {
      if (record.status === 'Late') return 'cal-late';
      return 'cal-present';
    }

    // Weekends (Sat=6, Sun=0)
    if (day === 0 || day === 6) return 'cal-holiday';

    return null;
  };

  return (
    <div className="card mt-4">
      <h3>Attendance Calendar</h3>
      <Calendar 
        tileClassName={tileClassName} 
      />
      <div className="cal-legend mt-2">
        <span className="badge bg-success">Present</span>
        <span className="badge bg-warning text-dark">Late</span>
        <span className="badge bg-info text-dark">Holiday (Sat/Sun)</span>
      </div>
    </div>
  );
};

export default CalendarView;