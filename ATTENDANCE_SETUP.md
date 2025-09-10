# Attendance Feature Setup Guide

## Google Sheets Setup

To enable the attendance feature, you need to add a new sheet to your existing Google Sheets document.

### Step 1: Create Attendance Sheet

1. Open your existing Google Sheets document
2. Right-click on the sheet tab at the bottom
3. Select "Insert sheet"
4. Name the sheet **exactly**: `Attendance`

### Step 2: Add Headers

In the first row of the new "Attendance" sheet, add these headers:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Schedule ID | Fraksi | Player Name | Status | Reason | Timestamp |

### Example Data Format

| Schedule ID | Fraksi | Player Name | Status | Reason | Timestamp |
|-------------|---------|-------------|--------|---------|-----------|
| 1 | Fraksi 1 | John Doe | unavailable | Sakit | 2024-01-15T10:30:00.000Z |
| 2 | Fraksi 2 | Jane Smith | unavailable | Kerja | 2024-01-15T11:45:00.000Z |

## How the Attendance Feature Works

### For Team Members:
1. **View Schedule**: Go to the "View Schedule" tab
2. **Find Match**: Look for the upcoming scrim match
3. **Click Attendance**: Click the "Attendance" button on any match card
4. **Mark Unavailable**: Enter your name and optional reason
5. **Submit**: Click "Tandai Tidak Hadir" to mark yourself as unavailable

### For Organizers:
- **View Unavailable Players**: See red notification badge with count
- **Manage Attendance**: Click attendance button to see who can't attend
- **Remove Players**: Mark players as available again if needed
- **Real-time Updates**: All changes sync immediately with Google Sheets

## Features

✅ **Mobile-First Design** - Touch-friendly interface  
✅ **Real-time Sync** - Instant updates to Google Sheets  
✅ **Duplicate Prevention** - Can't mark same player twice  
✅ **Visual Indicators** - Red badge shows unavailable count  
✅ **Optional Reasons** - Players can provide why they can't attend  
✅ **Easy Removal** - One-click to mark available again  
✅ **Timestamp Tracking** - Automatic timestamp for all entries  

## UI Elements

- **Attendance Button**: Shows on each schedule card with notification badge
- **Popup Interface**: Clean, focused UI for managing attendance
- **Player List**: Shows all unavailable players with reasons and timestamps
- **Quick Actions**: Add/remove players with simple buttons

The attendance system is designed to be simple and intuitive - players only need to mark when they CAN'T attend, making it easy for organizers to see who's available for each match.