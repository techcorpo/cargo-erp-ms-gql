import DataLoader from 'dataloader';

export function createDataLoaders(db) {
  
  // Company DataLoaders
  const companyLoader = new DataLoader(async (ids) => {
    const companies = await Promise.all(
      ids.map(id => db.getCompanyById(id))
    );
    return companies;
  });

  const companiesByUserLoader = new DataLoader(async (userIds) => {
    const results = await Promise.all(
      userIds.map(async (userId) => {
        const user = await db.query('SELECT company_id FROM users WHERE id = @id', { id: userId });
        if (user[0]?.company_id) {
          return await db.getCompanyById(user[0].company_id);
        }
        return null;
      })
    );
    return results;
  });

  // User DataLoaders
  const usersByCompanyLoader = new DataLoader(async (companyIds) => {
    const results = await Promise.all(
      companyIds.map(id => db.getUsersByCompanyId(id))
    );
    return results;
  });

  const userLoader = new DataLoader(async (ids) => {
    const users = await Promise.all(
      ids.map(async (id) => {
        const result = await db.query('SELECT * FROM users WHERE id = @id', { id });
        return result[0];
      })
    );
    return users;
  });

  // Branch DataLoaders
  const branchesByCompanyLoader = new DataLoader(async (companyIds) => {
    const results = await Promise.all(
      companyIds.map(id => db.getBranchesByCompanyId(id))
    );
    return results;
  });

  const branchLoader = new DataLoader(async (ids) => {
    const branches = await Promise.all(
      ids.map(async (id) => {
        const result = await db.query(`
          SELECT b.*, c_country.country_name, s.state_name, city.city_name
          FROM branches b
          LEFT JOIN countries c_country ON b.country_id = c_country.id
          LEFT JOIN states s ON b.state_id = s.id  
          LEFT JOIN cities city ON b.city_id = city.id
          WHERE b.id = @id
        `, { id });
        return result[0];
      })
    );
    return branches;
  });

  // Location DataLoaders
  const countryLoader = new DataLoader(async (ids) => {
    const countries = await Promise.all(
      ids.map(id => db.getLocationById('country', id))
    );
    return countries;
  });

  const stateLoader = new DataLoader(async (ids) => {
    const states = await Promise.all(
      ids.map(id => db.getLocationById('state', id))
    );
    return states;
  });

  const cityLoader = new DataLoader(async (ids) => {
    const cities = await Promise.all(
      ids.map(id => db.getLocationById('city', id))
    );
    return cities;
  });

  const statesByCountryLoader = new DataLoader(async (countryIds) => {
    const results = await Promise.all(
      countryIds.map(id => db.getStatesByCountryId(id))
    );
    return results;
  });

  const citiesByStateLoader = new DataLoader(async (stateIds) => {
    const results = await Promise.all(
      stateIds.map(id => db.getCitiesByStateId(id))
    );
    return results;
  });

  // System User DataLoaders
  const systemUserLoader = new DataLoader(async (ids) => {
    const users = await Promise.all(
      ids.map(id => db.getSystemUserById(id))
    );
    return users;
  });

  return {
    company: companyLoader,
    companiesByUser: companiesByUserLoader,
    usersByCompany: usersByCompanyLoader,
    user: userLoader,
    branchesByCompany: branchesByCompanyLoader,
    branch: branchLoader,
    country: countryLoader,
    state: stateLoader,
    city: cityLoader,
    statesByCountry: statesByCountryLoader,
    citiesByState: citiesByStateLoader,
    systemUser: systemUserLoader
  };
}
