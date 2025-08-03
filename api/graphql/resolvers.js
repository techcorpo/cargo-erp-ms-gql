import { GraphQLScalarType, GraphQLError } from 'graphql';
import { Kind } from 'graphql/language/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Custom scalar types
const DateTimeType = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date custom scalar type',
  serialize(value) {
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const UUIDType = new GraphQLScalarType({
  name: 'UUID',
  description: 'UUID custom scalar type',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return ast.value;
    }
    return null;
  },
});

// Helper functions
const requireAuth = (user) => {
  if (!user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' }
    });
  }
  return user;
};

const requireAdminAuth = (user) => {
  requireAuth(user);
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    throw new GraphQLError('Admin access required', {
      extensions: { code: 'FORBIDDEN' }
    });
  }
  return user;
};

export const resolvers = {
  DateTime: DateTimeType,
  UUID: UUIDType,

  // Type resolvers
  Company: {
    // Field mappings from database columns to GraphQL fields
    companyName: (parent) => parent.company_name,
    companyEmail: (parent) => parent.company_email,
    companyAddress: (parent) => parent.company_address,
    companyPhone: (parent) => parent.company_phone,
    companyRegistrationNumber: (parent) => parent.company_registration_number,
    taxId: (parent) => parent.tax_id,
    isActive: (parent) => parent.is_active,
    isDeleted: (parent) => parent.is_deleted,
    approvedAt: (parent) => parent.approved_at,
    rejectionReason: (parent) => parent.rejection_reason,
    createdAt: (parent) => parent.created_at,
    updatedAt: (parent) => parent.updated_at,
    
    // Relationship resolvers
    approvedBy: async (parent, args, { dataloaders }) => {
      if (!parent.approved_by) return null;
      return await dataloaders.systemUser.load(parent.approved_by);
    },
    users: async (parent, args, { dataloaders }) => {
      return await dataloaders.usersByCompany.load(parent.id);
    },
    branches: async (parent, args, { dataloaders }) => {
      return await dataloaders.branchesByCompany.load(parent.id);
    }
  },

  User: {
    company: async (parent, args, { dataloaders }) => {
      if (!parent.company_id) return null;
      return await dataloaders.company.load(parent.company_id);
    },
    branch: async (parent, args, { dataloaders }) => {
      if (!parent.branch_id) return null;
      return await dataloaders.branch.load(parent.branch_id);
    }
  },

  Branch: {
    company: async (parent, args, { dataloaders }) => {
      return await dataloaders.company.load(parent.company_id);
    },
    country: async (parent, args, { dataloaders }) => {
      if (!parent.country_id) return null;
      return await dataloaders.country.load(parent.country_id);
    },
    state: async (parent, args, { dataloaders }) => {
      if (!parent.state_id) return null;
      return await dataloaders.state.load(parent.state_id);
    },
    city: async (parent, args, { dataloaders }) => {
      if (!parent.city_id) return null;
      return await dataloaders.city.load(parent.city_id);
    }
  },

  Country: {
    countryName: (parent) => parent.country_name,
    countryCode: (parent) => parent.country_code,
    states: async (parent, args, { dataloaders }) => {
      return await dataloaders.statesByCountry.load(parent.id);
    }
  },

  State: {
    stateName: (parent) => parent.state_name,
    stateCode: (parent) => parent.state_code,
    country: async (parent, args, { dataloaders }) => {
      return await dataloaders.country.load(parent.country_id);
    },
    cities: async (parent, args, { dataloaders }) => {
      return await dataloaders.citiesByState.load(parent.id);
    }
  },

  City: {
    cityName: (parent) => parent.city_name,
    cityCode: (parent) => parent.city_code,
    state: async (parent, args, { dataloaders }) => {
      return await dataloaders.state.load(parent.state_id);
    }
  },

  Query: {
    me: async (parent, args, { user, db }) => {
      const authUser = requireAuth(user);
      return await db.getSystemUserById(authUser.id);
    },

    companies: async (parent, { filter, limit, offset }, { user, db }) => {
      requireAdminAuth(user);
      return await db.getCompanies(filter, limit, offset);
    },

    company: async (parent, { id }, { user, db }) => {
      requireAdminAuth(user);
      return await db.getCompanyById(id);
    },

    pendingCompanies: async (parent, args, { user, db }) => {
      requireAdminAuth(user);
      return await db.getCompanies({ status: 'PENDING_REVIEW' });
    },

    users: async (parent, { filter, limit, offset }, { user, db }) => {
      requireAdminAuth(user);
      
      let whereClause = "WHERE (is_deleted = 0 OR is_deleted IS NULL)";
      const params = { limit, offset };
      
      if (filter?.companyId) {
        whereClause += " AND company_id = @companyId";
        params.companyId = filter.companyId;
      }
      
      if (filter?.role) {
        whereClause += " AND role = @role";
        params.role = filter.role;
      }
      
      if (filter?.isActive !== undefined) {
        whereClause += " AND is_active = @isActive";
        params.isActive = filter.isActive;
      }
      
      if (filter?.search) {
        whereClause += " AND (first_name LIKE @search OR last_name LIKE @search OR email LIKE @search)";
        params.search = `%${filter.search}%`;
      }
      
      const query = `
        SELECT * FROM users 
        ${whereClause}
        ORDER BY created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `;
      
      return await db.query(query, params);
    },

    user: async (parent, { id }, { user, db }) => {
      requireAdminAuth(user);
      const result = await db.query('SELECT * FROM users WHERE id = @id', { id });
      return result[0];
    },

    countries: async (parent, args, { db }) => {
      return await db.getCountries();
    },

    states: async (parent, { countryId }, { db }) => {
      return await db.getStatesByCountryId(countryId);
    },

    cities: async (parent, { stateId }, { db }) => {
      return await db.getCitiesByStateId(stateId);
    },

    branches: async (parent, { companyId }, { user, db }) => {
      requireAuth(user);
      return await db.getBranchesByCompanyId(companyId);
    },

    branch: async (parent, { id }, { user, db }) => {
      requireAuth(user);
      const result = await db.query(`
        SELECT b.*, c_country.country_name, s.state_name, city.city_name
        FROM branches b
        LEFT JOIN countries c_country ON b.country_id = c_country.id
        LEFT JOIN states s ON b.state_id = s.id  
        LEFT JOIN cities city ON b.city_id = city.id
        WHERE b.id = @id
      `, { id });
      return result[0];
    }
  },

  Mutation: {
    login: async (parent, { input }, { db }) => {
      try {
        const { email, password } = input;
        
        // Get user from database
        const user = await db.getSystemUserByEmail(email);
        
        if (!user) {
          return {
            success: false,
            message: 'Invalid email or password',
            token: null,
            user: null
          };
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
          return {
            success: false,
            message: 'Invalid email or password',
            token: null,
            user: null
          };
        }
        
        // Generate JWT token
        const token = jwt.sign(
          { 
            id: user.id, 
            email: user.email, 
            role: user.role 
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );
        
        return {
          success: true,
          message: 'Login successful',
          token,
          user
        };
        
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          message: 'Login failed',
          token: null,
          user: null
        };
      }
    },

    logout: async () => {
      // Client-side token removal
      return true;
    },

    registerCompany: async (parent, { input }, { db }) => {
      try {
        const { company, user, branch } = input;
        
        // Hash the password
        const passwordHash = await bcrypt.hash(user.password, 10);
        
        // Start a transaction-like operation
        let companyId, userId, branchId;
        
        try {
          // 1. Insert company
          const companyResult = await db.query(`
            INSERT INTO companies (
              company_name, company_email, company_address, company_phone,
              industry, website, company_registration_number, tax_id,
              status, is_active, is_deleted, created_at, updated_at
            ) 
            OUTPUT INSERTED.id
            VALUES (
              @companyName, @companyEmail, @companyAddress, @companyPhone,
              @industry, @website, @companyRegistrationNumber, @taxId,
              'PENDING_REVIEW', 0, 0, GETDATE(), GETDATE()
            )
          `, {
            companyName: company.companyName,
            companyEmail: company.companyEmail,
            companyAddress: company.companyAddress,
            companyPhone: company.companyPhone,
            industry: company.industry,
            website: company.website,
            companyRegistrationNumber: company.companyRegistrationNumber,
            taxId: company.taxId
          });
          
          companyId = companyResult[0].id;
          
          // 2. Insert user
          const userResult = await db.query(`
            INSERT INTO users (
              company_id, email, password, first_name, last_name,
              role, is_active, is_deleted, created_at, updated_at
            )
            OUTPUT INSERTED.id
            VALUES (
              @companyId, @email, @passwordHash, @firstName, @lastName,
              'COMPANY_ADMIN', 1, 0, GETDATE(), GETDATE()
            )
          `, {
            companyId: companyId,
            email: user.email,
            passwordHash: passwordHash,
            firstName: user.firstName,
            lastName: user.lastName
          });
          
          userId = userResult[0].id;
          
          // 3. Insert branch
          const branchResult = await db.query(`
            INSERT INTO branches (
              company_id, branch_name, branch_phone, address_line_1, address_line_2,
              country_id, state_id, city_id, postal_code, is_primary,
              is_active, is_deleted, created_at, updated_at
            )
            OUTPUT INSERTED.id
            VALUES (
              @companyId, @branchName, @branchPhone, @addressLine1, @addressLine2,
              @countryId, @stateId, @cityId, @postalCode, 1,
              1, 0, GETDATE(), GETDATE()
            )
          `, {
            companyId: companyId,
            branchName: branch.branchName,
            branchPhone: branch.branchPhone || null,
            addressLine1: branch.addressLine1,
            addressLine2: branch.addressLine2 || null,
            countryId: branch.countryId || null,
            stateId: branch.stateId || null,
            cityId: branch.cityId || null,
            postalCode: branch.postalCode || null
          });
          
          branchId = branchResult[0].id;
          
          // 4. Update user with branch_id
          await db.query(`
            UPDATE users 
            SET branch_id = @branchId, updated_at = GETDATE()
            WHERE id = @userId
          `, {
            branchId: branchId,
            userId: userId
          });
          
          // Get the created company for response
          const createdCompany = await db.getCompanyById(companyId);
          
          return {
            success: true,
            message: 'Company registration submitted successfully! We will review and activate your company shortly.',
            company: createdCompany
          };
          
        } catch (dbError) {
          // Rollback: Delete created records (best effort)
          try {
            if (branchId) await db.query('DELETE FROM branches WHERE id = @branchId', { branchId });
            if (userId) await db.query('DELETE FROM users WHERE id = @userId', { userId });
            if (companyId) await db.query('DELETE FROM companies WHERE id = @companyId', { companyId });
          } catch (rollbackError) {
            console.error('Rollback error:', rollbackError);
          }
          throw dbError;
        }
        
      } catch (error) {
        console.error('Registration error:', error);
        return {
          success: false,
          message: error.message || 'Registration failed. Please try again.',
          company: null
        };
      }
    },

    approveCompany: async (parent, { input }, { user, db }) => {
      const authUser = requireAdminAuth(user);
      
      try {
        const { companyId, approved, rejectionReason } = input;
        
        let result;
        if (approved) {
          result = await db.approveCompany(companyId, authUser.id);
        } else {
          if (!rejectionReason) {
            throw new GraphQLError('Rejection reason is required when rejecting a company');
          }
          result = await db.rejectCompany(companyId, authUser.id, rejectionReason);
        }
        
        if (result.output.success) {
          const company = await db.getCompanyById(companyId);
          return {
            success: true,
            message: result.output.message,
            company
          };
        } else {
          return {
            success: false,
            message: result.output.message,
            company: null
          };
        }
        
      } catch (error) {
        console.error('Company approval error:', error);
        return {
          success: false,
          message: error.message || 'Failed to process company approval',
          company: null
        };
      }
    },

    createCompany: async (parent, { input }, { db }) => {
      try {
        const query = `
          INSERT INTO companies (
            company_name, company_email, company_address, company_phone,
            industry, website, company_registration_number, tax_id,
            status, is_active, is_deleted, created_at, updated_at
          ) 
          OUTPUT INSERTED.id
          VALUES (
            @companyName, @companyEmail, @companyAddress, @companyPhone,
            @industry, @website, @companyRegistrationNumber, @taxId,
            'PENDING_REVIEW', 0, 0, GETDATE(), GETDATE()
          )
        `;
        
        const result = await db.query(query, {
          companyName: input.companyName,
          companyEmail: input.companyEmail,
          companyAddress: input.companyAddress,
          companyPhone: input.companyPhone,
          industry: input.industry,
          website: input.website,
          companyRegistrationNumber: input.companyRegistrationNumber,
          taxId: input.taxId
        });
        
        const newCompanyId = result[0].id;
        const company = await db.getCompanyById(newCompanyId);
        
        return {
          success: true,
          message: 'Company created successfully',
          company
        };
        
      } catch (error) {
        console.error('Create company error:', error);
        return {
          success: false,
          message: error.message || 'Failed to create company',
          company: null
        };
      }
    }
  }
};
