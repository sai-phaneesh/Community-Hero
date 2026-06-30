import { Pool } from "pg";
import { SurveyRepository } from "../../domain/repositories/survey.repository";
import { Survey } from "../../../types";

export class CockroachJsonSurveyRepository implements SurveyRepository {
  constructor(
    private pool: Pool | null,
    private readLocalDB: () => any,
    private writeLocalDB: (data: any) => void
  ) {}

  private mapRowToSurvey(row: any): Survey {
    return {
      id: row.id,
      month: row.month,
      residentId: row.resident_id,
      residentName: row.resident_name,
      overallHappiness: row.overall_happiness,
      localServicesRating: row.local_services_rating,
      roadQualityRating: row.road_quality_rating,
      cleanlinessRating: row.cleanliness_rating,
      feedbackText: row.feedback_text || "",
      date: new Date(row.date).toISOString(),
    };
  }

  async findAll(): Promise<Survey[]> {
    if (this.pool) {
      try {
        const res = await this.pool.query("SELECT * FROM surveys");
        return res.rows.map((row) => this.mapRowToSurvey(row));
      } catch (err) {
        console.error("[SurveyRepository Database Error] findAll failed:", err);
        throw new Error("Database error while retrieving surveys.");
      }
    }
    const local = this.readLocalDB();
    return local.surveys;
  }

  async findByResidentAndMonth(residentId: string, month: string): Promise<Survey | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query(
          "SELECT * FROM surveys WHERE resident_id = $1 AND month = $2",
          [residentId, month]
        );
        if (res.rows.length === 0) return null;
        return this.mapRowToSurvey(res.rows[0]);
      } catch (err) {
        console.error("[SurveyRepository Database Error] findByResidentAndMonth failed:", err);
        throw new Error("Database error while checking monthly survey records.");
      }
    }
    const local = this.readLocalDB();
    const survey = local.surveys.find(
      (s: any) => s.residentId === residentId && s.month === month
    );
    return survey || null;
  }

  async create(survey: Survey): Promise<Survey> {
    if (this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO surveys (
            id, month, resident_id, resident_name, overall_happiness, 
            local_services_rating, road_quality_rating, cleanliness_rating, feedback_text, date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            survey.id,
            survey.month,
            survey.residentId,
            survey.residentName,
            survey.overallHappiness,
            survey.localServicesRating,
            survey.roadQualityRating,
            survey.cleanlinessRating,
            survey.feedbackText,
            new Date(survey.date),
          ]
        );
        return survey;
      } catch (err) {
        console.error("[SurveyRepository Database Error] create failed:", err);
        throw new Error("Database error while registering survey submission.");
      }
    }
    const local = this.readLocalDB();
    local.surveys.push(survey);
    this.writeLocalDB(local);
    return survey;
  }
}
