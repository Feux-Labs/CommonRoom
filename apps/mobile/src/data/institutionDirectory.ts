import directory from './nigerianInstitutions.json';
import { Institution, InstitutionType } from '../types/domain';

function parseInstitutionType(value: string): InstitutionType {
  if (value === 'university' || value === 'polytechnic' || value === 'college_of_education') {
    return value;
  }

  throw new Error(`Unsupported institution type in directory: ${value}`);
}

export const institutionDirectoryMetadata = directory.metadata;

export const nigerianInstitutions: Institution[] = directory.institutions.map((institution) => ({
  id: institution.id,
  name: institution.name,
  type: parseInstitutionType(institution.type),
  category: institution.category,
  location: institution.location,
}));

export const institutionCounts = {
  total: nigerianInstitutions.length,
  universities: nigerianInstitutions.filter((institution) => institution.type === 'university').length,
  polytechnics: nigerianInstitutions.filter((institution) => institution.type === 'polytechnic').length,
  colleges: nigerianInstitutions.filter((institution) => institution.type === 'college_of_education').length,
};
