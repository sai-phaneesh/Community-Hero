import { Survey } from "../../../types";

export interface SurveyRepository {
  findAll(): Promise<Survey[]>;
  findByResidentAndMonth(residentId: string, month: string): Promise<Survey | null>;
  create(survey: Survey): Promise<Survey>;
}
