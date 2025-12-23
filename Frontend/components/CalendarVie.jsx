import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Import default styles
import '../src/App.css'; 

const CalendarView = ({ attendanceData }) => {
  
  // Logic to style each day tile
  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return null;

    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    const dateStr = date.toISOString().split('T')[0];
    
    // 1. Check for Weekends (Holidays)
    if (day === 0 || day === 6) return 'cal-holiday';

    // 2. Check Attendance Status
    const record = attendanceData.find(r => r.date === dateStr);

    if (record) {
      if (record.status === 'Present') return 'cal-present';
      if (record.status === 'Late') return 'cal-late';
      if (record.status === 'Absent') return 'cal-absent';
      if (record.status === 'On Leave') return 'cal-leave';
    }

    return null;
  };

  return (
    <div className="card p-3">
      <h3 className="mb-3">📅 My Attendance Calendar</h3>
      <div className="d-flex justify-content-center">
        <Calendar 
          tileClassName={tileClassName} 
        />
      </div>
      
      {/* Legend */}
      <div className="mt-3 d-flex flex-wrap gap-2 justify-content-center">
        <span className="badge bg-success">Present</span>
        <span className="badge bg-warning text-dark">Late</span>
        <span className="badge bg-danger">Absent</span>
        <span className="badge bg-secondary">Holiday (Sat/Sun)</span>
      </div>
    </div>
  );
};

export default CalendarView;