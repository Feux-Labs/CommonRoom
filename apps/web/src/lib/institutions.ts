import directory from '../../../mobile/src/data/nigerianInstitutions.json';

export type Institution = {
  id: string;
  name: string;
  type: 'university' | 'polytechnic' | 'college_of_education';
  category: string;
  location: string;
};

export const institutions: Institution[] = directory.institutions.reduce<Institution[]>((items, item) => {
  switch (item.type) {
    case 'university':
      items.push({ ...item, type: 'university' });
      break;
    case 'polytechnic':
      items.push({ ...item, type: 'polytechnic' });
      break;
    case 'college_of_education':
      items.push({ ...item, type: 'college_of_education' });
      break;
  }
  return items;
}, []);
