import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

export class DatabaseService {
  constructor() {
    this.config = {
      server: process.env.DB_SERVER || 'localhost',
      database: process.env.DB_NAME || 'cargo_db',
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD?.replace(/"/g, '') || 'your_password', // Remove quotes
      port: parseInt(process.env.DB_PORT) || 1433,
      options: {
        encrypt: true, // Always true for Azure SQL
        trustServerCertificate: false, // Should be false for Azure SQL
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };
    
    this.pool = null;
    this.initializePool();
  }

  async initializePool() {
    try {
      this.pool = await sql.connect(this.config);
      console.log('✅ SQL Server connection pool established');
    } catch (error) {
      console.error('❌ SQL Server connection failed:', error);
      throw error;
    }
  }

  async query(queryText, params = {}) {
    try {
      const request = this.pool.request();
      
      // Add parameters
      Object.entries(params).forEach(([key, value]) => {
        // Always add parameters, even if null - SQL Server needs them declared
        if (value === null || value === undefined) {
          request.input(key, sql.NVarChar, null);
        } else if (typeof value === 'string' && value.length === 36 && value.includes('-')) {
          request.input(key, sql.UniqueIdentifier, value);
        } else if (typeof value === 'boolean') {
          request.input(key, sql.Bit, value);
        } else if (typeof value === 'number') {
          request.input(key, sql.Int, value);
        } else if (value instanceof Date) {
          request.input(key, sql.DateTime2, value);
        } else {
          request.input(key, sql.NVarChar, value);
        }
      });
      
      const result = await request.query(queryText);
      return result.recordset;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async callProcedure(procedureName, params = {}) {
    try {
      const request = this.pool.request();
      
      // Add input parameters
      Object.entries(params.input || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'string' && value.length === 36 && value.includes('-')) {
            request.input(key, sql.UniqueIdentifier, value);
          } else if (typeof value === 'boolean') {
            request.input(key, sql.Bit, value);
          } else if (typeof value === 'number') {
            request.input(key, sql.Int, value);
          } else if (value instanceof Date) {
            request.input(key, sql.DateTime2, value);
          } else {
            request.input(key, sql.NVarChar, value);
          }
        }
      });
      
      // Add output parameters
      Object.entries(params.output || {}).forEach(([key, type]) => {
        switch (type) {
          case 'bit':
            request.output(key, sql.Bit);
            break;
          case 'nvarchar':
            request.output(key, sql.NVarChar(500));
            break;
          default:
            request.output(key, sql.NVarChar(500));
        }
      });
      
      const result = await request.execute(procedureName);
      
      return {
        recordset: result.recordset,
        output: result.output
      };
    } catch (error) {
      console.error('Stored procedure call error:', error);
      throw error;
    }
  }

  // Company queries
  async getCompanies(filter = {}, limit = 20, offset = 0) {
    let whereClause = "WHERE c.is_deleted = 0 OR c.is_deleted IS NULL";
    const params = { limit, offset };
    
    if (filter.status) {
      whereClause += " AND c.status = @status";
      params.status = filter.status;
    }
    
    if (filter.industry) {
      whereClause += " AND c.industry = @industry";
      params.industry = filter.industry;
    }
    
    if (filter.search) {
      whereClause += " AND (c.company_name LIKE @search OR c.company_email LIKE @search)";
      params.search = `%${filter.search}%`;
    }
    
    const query = `
      SELECT c.*, su.email as approver_email, su.first_name as approver_first_name, su.last_name as approver_last_name
      FROM companies c
      LEFT JOIN system_users su ON c.approved_by = su.id
      ${whereClause}
      ORDER BY c.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    
    return await this.query(query, params);
  }

  async getCompanyById(id) {
    const query = `
      SELECT c.*, su.email as approver_email, su.first_name as approver_first_name, su.last_name as approver_last_name
      FROM companies c
      LEFT JOIN system_users su ON c.approved_by = su.id
      WHERE c.id = @id AND (c.is_deleted = 0 OR c.is_deleted IS NULL)
    `;
    
    const result = await this.query(query, { id });
    return result[0];
  }

  async getUsersByCompanyId(companyId) {
    const query = `
      SELECT * FROM users 
      WHERE company_id = @companyId AND (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY created_at DESC
    `;
    
    return await this.query(query, { companyId });
  }

  async getBranchesByCompanyId(companyId) {
    const query = `
      SELECT b.*, c_country.country_name, s.state_name, city.city_name
      FROM branches b
      LEFT JOIN countries c_country ON b.country_id = c_country.id
      LEFT JOIN states s ON b.state_id = s.id  
      LEFT JOIN cities city ON b.city_id = city.id
      WHERE b.company_id = @companyId AND (b.is_deleted = 0 OR b.is_deleted IS NULL)
      ORDER BY b.is_primary DESC, b.created_at DESC
    `;
    
    return await this.query(query, { companyId });
  }

  // System user queries
  async getSystemUserByEmail(email) {
    const query = `
      SELECT * FROM system_users 
      WHERE email = @email AND is_active = 1 AND (is_deleted = 0 OR is_deleted IS NULL)
    `;
    
    const result = await this.query(query, { email });
    return result[0];
  }

  async getSystemUserById(id) {
    const query = `
      SELECT * FROM system_users 
      WHERE id = @id AND (is_deleted = 0 OR is_deleted IS NULL)
    `;
    
    const result = await this.query(query, { id });
    return result[0];
  }

  // Location queries
  async getCountries() {
    const query = `
      SELECT 
        id,
        country_name as countryName,
        country_code as countryCode,
        created_at as createdAt
      FROM countries 
      ORDER BY country_name
    `;
    return await this.query(query);
  }

  async getStatesByCountryId(countryId) {
    const query = `
      SELECT 
        id,
        country_id as countryId,
        state_name as stateName,
        state_code as stateCode,
        created_at as createdAt
      FROM states 
      WHERE country_id = @countryId 
      ORDER BY state_name
    `;
    return await this.query(query, { countryId });
  }

  async getCitiesByStateId(stateId) {
    const query = `
      SELECT 
        id,
        state_id as stateId,
        city_name as cityName,
        city_code as cityCode,
        created_at as createdAt
      FROM cities 
      WHERE state_id = @stateId 
      ORDER BY city_name
    `;
    return await this.query(query, { stateId });
  }

  async getLocationById(type, id) {
    const table = type === 'country' ? 'countries' : type === 'state' ? 'states' : 'cities';
    const query = `SELECT * FROM ${table} WHERE id = @id`;
    const result = await this.query(query, { id });
    return result[0];
  }

  // Company approval procedures
  async approveCompany(companyId, systemUserId) {
    return await this.callProcedure('sp_approve_company', {
      input: {
        company_id: companyId,
        system_user_id: systemUserId
      },
      output: {
        success: 'bit',
        message: 'nvarchar'
      }
    });
  }

  async rejectCompany(companyId, systemUserId, rejectionReason) {
    return await this.callProcedure('sp_reject_company', {
      input: {
        company_id: companyId,
        system_user_id: systemUserId,
        rejection_reason: rejectionReason
      },
      output: {
        success: 'bit',
        message: 'nvarchar'
      }
    });
  }

  async close() {
    if (this.pool) {
      await this.pool.close();
      console.log('SQL Server connection pool closed');
    }
  }
}
