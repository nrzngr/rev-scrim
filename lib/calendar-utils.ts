import { format, parseISO } from 'date-fns';

interface ScheduleItem {
  id: number;
  tanggalScrim: string;
  lawan: string;
  map: string;
  startMatch: string;
}

/**
 * Generates a Google Calendar URL for a scrim schedule
 * @param schedule The scrim schedule item
 * @param fraksi The fraksi name (Fraksi 1 or Fraksi 2)
 * @returns A Google Calendar URL
 */
export function generateGoogleCalendarUrl(schedule: ScheduleItem, fraksi: string): string {
  try {
    // Parse date and time
    const scrimDate = parseISO(schedule.tanggalScrim);
    const [hours, minutes] = schedule.startMatch.split(':').map(Number);
    
    // Create start and end Date objects
    const startDateTime = new Date(scrimDate);
    startDateTime.setHours(hours, minutes, 0, 0);
    
    // Set end time to 2 hours after start time (default match duration)
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + 2);
    
    // Format dates for Google Calendar (RFC3339 format without colons, preserving local timezone)
    const formatDateForGoogle = (date: Date) => {
      // Get the timezone offset in minutes and convert to milliseconds
      const timezoneOffset = date.getTimezoneOffset();
      const offsetSign = timezoneOffset <= 0 ? '+' : '-';
      const offsetHours = Math.abs(Math.floor(timezoneOffset / 60)).toString().padStart(2, '0');
      const offsetMinutes = Math.abs(timezoneOffset % 60).toString().padStart(2, '0');
      
      // Format the date without timezone indicator first
      const formattedDate = format(date, "yyyyMMdd'T'HHmmss");
      
      // Append the timezone offset instead of 'Z' to preserve local time
      return `${formattedDate}${offsetSign}${offsetHours}${offsetMinutes}`;
    };
    
    const startDate = formatDateForGoogle(startDateTime);
    const endDate = formatDateForGoogle(endDateTime);
    
    // Format date for display
    const formattedDate = format(startDateTime, "EEEE, MMMM d, yyyy");
    const formattedTime = format(startDateTime, "h:mm a");
    
    // Create event title - more clear and readable without emojis
    const title = `REV vs ${schedule.lawan || 'TBD'} (${fraksi})`;
    
    // Create event description with better formatting and more information
    // Using HTML line breaks for better readability in Google Calendar
    const description = [
      `Tanggal: ${formattedDate}<br>`,
      `Waktu: ${formattedTime}<br>`,
      '<br>',
      'DETAIL PERTANDINGAN<br>',
      `Tim: REV Team (${fraksi})<br>`,
      `Lawan: ${schedule.lawan || 'TBD'}<br>`,
      `Map: ${schedule.map || 'TBD'}<br>`,
      '<br>',
      'CATATAN<br>',
      '• Harap online 15 menit sebelum pertandingan<br>',
      '• Periksa Discord untuk komunikasi tim<br>',
      '• Semoga beruntung dan bersenang-senang!<br>',
      '<br>',
      'Ditambahkan dari REV Scrim Scheduler'
    ].join('');
    
    // Construct Google Calendar URL without encoding text and details
    // Google Calendar will handle the encoding properly
    const baseUrl = 'https://calendar.google.com/calendar/render';
    return `${baseUrl}?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${description}&location=Online Scrim Match`;
  } catch (error) {
    console.error('Error generating Google Calendar URL:', error);
    // Return a fallback URL
    return 'https://calendar.google.com/calendar';
  }
}
