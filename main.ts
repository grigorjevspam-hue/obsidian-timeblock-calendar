import { App, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf } from "obsidian";
import * as dayjs from "dayjs";

interface EventItem {
	date: string;
	time?: string;
	file: TFile;
}

export default class CalendarCollectorPlugin extends Plugin {
	private events: EventItem[] = [];

	async onload() {
		console.log("📅 Calendar Collector loaded");

		this.addRibbonIcon("calendar", "Открыть календарь", () => {
			this.openCalendarView();
		});

		this.addCommand({
			id: "refresh-calendar",
			name: "Обновить календарь",
			callback: () => this.collectDates()
		});

		await this.collectDates();
	}

	async collectDates() {
		this.events = [];
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const content = await this.app.vault.read(file);

			// ищем даты вида YYYY-MM-DD или YYYY-MM-DD HH:mm
			const regex = /\b(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?\b/g;
			let match;

			while ((match = regex.exec(content)) !== null) {
				this.events.push({
					date: match[1],
					time: match[2],
					file
				});
			}
		}

		console.log("✅ Найдено событий:", this.events.length);
	}

	openCalendarView() {
		const eventsByDate = this.groupEventsByDate();

		let html = `<h2>Календарь заметок</h2>`;
		for (const [date, items] of Object.entries(eventsByDate)) {
			html += `<h3>${date}</h3><ul>`;
			for (const e of items) {
				html += `<li><a href="obsidian://open?vault=${this.app.vault.getName()}&file=${encodeURIComponent(e.file.path)}">${e.file.basename}</a>${e.time ? " – " + e.time : ""}</li>`;
			}
			html += "</ul>";
		}

		const modal = new CalendarModal(this.app, html);
		modal.open();
	}

	groupEventsByDate() {
		const map: Record<string, EventItem[]> = {};
		for (const e of this.events) {
			if (!map[e.date]) map[e.date] = [];
			map[e.date].push(e);
		}
		return map;
	}
}

class CalendarModal extends import("obsidian").Modal {
	contentHtml: string;
	constructor(app: App, html: string) {
		super(app);
		this.contentHtml = html;
	}
	onOpen() {
		this.contentEl.innerHTML = this.contentHtml;
	}
}
