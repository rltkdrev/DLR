const { google } = require('googleapis');

class CalendarService {
    constructor(credentials) {
        this.calendar = google.calendar({ version: 'v3', auth: credentials });
        this.calendarId = process.env.GOOGLE_CALENDAR_ID;
    }

    async listEvents(timeMin, timeMax) {
        try {
            const response = await this.calendar.events.list({
                calendarId: this.calendarId,
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });
            return response.data.items;
        } catch (error) {
            console.error('Error listing events:', error);
            throw error;
        }
    }

    async createEvent(event) {
        try {
            const response = await this.calendar.events.insert({
                calendarId: this.calendarId,
                requestBody: event,
            });
            return response.data;
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    }

    async deleteEvent(eventId) {
        try {
            await this.calendar.events.delete({
                calendarId: this.calendarId,
                eventId: eventId,
            });
            return true;
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    }

    async getEvent(eventId) {
        try {
            const response = await this.calendar.events.get({
                calendarId: this.calendarId,
                eventId: eventId,
            });
            return response.data;
        } catch (error) {
            console.error('Error getting event:', error);
            throw error;
        }
    }
}

module.exports = CalendarService; 