import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime
  scalar UUID

  # Enums
  enum CompanyStatus {
    PENDING_REVIEW
    APPROVED
    REJECTED
  }

  enum UserRole {
    SUPER_ADMIN
    ADMIN
    COMPANY_ADMIN
    USER
  }

  # Types
  type SystemUser {
    id: UUID!
    email: String!
    firstName: String
    lastName: String
    role: UserRole!
    isActive: Boolean!
    isDeleted: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Company {
    id: UUID!
    companyName: String!
    companyEmail: String!
    companyAddress: String
    companyPhone: String
    industry: String
    website: String
    companyRegistrationNumber: String
    taxId: String
    status: CompanyStatus!
    isActive: Boolean!
    isDeleted: Boolean!
    approvedBy: SystemUser
    approvedAt: DateTime
    rejectionReason: String
    createdAt: DateTime!
    updatedAt: DateTime!
    
    # Related data
    users: [User!]!
    branches: [Branch!]!
  }

  type User {
    id: UUID!
    company: Company
    branch: Branch
    email: String!
    firstName: String
    lastName: String
    role: UserRole!
    isApproved: Boolean!
    isActive: Boolean!
    isDeleted: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Branch {
    id: UUID!
    company: Company!
    branchName: String!
    branchPhone: String
    addressLine1: String!
    addressLine2: String
    country: Country
    state: State
    city: City
    postalCode: String
    isPrimary: Boolean!
    isActive: Boolean!
    isDeleted: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Country {
    id: String!
    countryName: String!
    countryCode: String
    createdAt: DateTime!
    states: [State!]!
  }

  type State {
    id: String!
    country: Country!
    stateName: String!
    stateCode: String
    createdAt: DateTime!
    cities: [City!]!
  }

  type City {
    id: String!
    state: State!
    cityName: String!
    cityCode: String
    createdAt: DateTime!
  }

  # Response types
  type AuthResponse {
    success: Boolean!
    message: String!
    token: String
    user: SystemUser
  }

  type CompanyResponse {
    success: Boolean!
    message: String!
    company: Company
  }

  type UserResponse {
    success: Boolean!
    message: String!
    user: User
  }

  # Input types
  input LoginInput {
    email: String!
    password: String!
  }

  input CompanyInput {
    companyName: String!
    companyEmail: String!
    companyAddress: String
    companyPhone: String
    industry: String
    website: String
    companyRegistrationNumber: String
    taxId: String
  }

  input UserInput {
    companyId: UUID!
    email: String!
    password: String!
    firstName: String
    lastName: String
    role: UserRole = USER
  }

  input BranchInput {
    companyId: UUID!
    branchName: String!
    branchPhone: String
    addressLine1: String!
    addressLine2: String
    countryId: String!
    stateId: String!
    cityId: String!
    postalCode: String
    isPrimary: Boolean = false
  }

  input CompanyApprovalInput {
    companyId: UUID!
    approved: Boolean!
    rejectionReason: String
  }

  # Registration input types
  input RegisterCompanyDataInput {
    companyName: String!
    companyEmail: String!
    companyAddress: String
    companyPhone: String
    industry: String
    website: String
    companyRegistrationNumber: String
    taxId: String
  }

  input RegisterUserDataInput {
    email: String!
    password: String!
    firstName: String
    lastName: String
  }

  input RegisterBranchDataInput {
    branchName: String!
    branchPhone: String
    addressLine1: String!
    addressLine2: String
    countryId: String
    stateId: String
    cityId: String
    postalCode: String
  }

  input RegisterCompanyInput {
    company: RegisterCompanyDataInput!
    user: RegisterUserDataInput!
    branch: RegisterBranchDataInput!
  }

  type RegisterCompanyResponse {
    success: Boolean!
    message: String!
    company: Company
  }

  # Query filters
  input CompanyFilter {
    status: CompanyStatus
    industry: String
    search: String
  }

  input UserFilter {
    companyId: UUID
    role: UserRole
    isActive: Boolean
    search: String
  }

  # Queries
  type Query {
    # Authentication
    me: SystemUser

    # Companies
    companies(filter: CompanyFilter, limit: Int = 20, offset: Int = 0): [Company!]!
    company(id: UUID!): Company
    pendingCompanies: [Company!]!

    # Users
    users(filter: UserFilter, limit: Int = 20, offset: Int = 0): [User!]!
    user(id: UUID!): User

    # Locations
    countries: [Country!]!
    states(countryId: String!): [State!]!
    cities(stateId: String!): [City!]!

    # Branches
    branches(companyId: UUID!): [Branch!]!
    branch(id: UUID!): Branch
  }

  # Mutations
  type Mutation {
    # Authentication
    login(input: LoginInput!): AuthResponse!
    logout: Boolean!

    # Registration
    registerCompany(input: RegisterCompanyInput!): RegisterCompanyResponse!

    # Company Management
    createCompany(input: CompanyInput!): CompanyResponse!
    updateCompany(id: UUID!, input: CompanyInput!): CompanyResponse!
    approveCompany(input: CompanyApprovalInput!): CompanyResponse!
    deleteCompany(id: UUID!): CompanyResponse!

    # User Management
    createUser(input: UserInput!): UserResponse!
    updateUser(id: UUID!, input: UserInput!): UserResponse!
    deleteUser(id: UUID!): UserResponse!

    # Branch Management
    createBranch(input: BranchInput!): Branch!
    updateBranch(id: UUID!, input: BranchInput!): Branch!
    deleteBranch(id: UUID!): Boolean!
  }

  # Subscriptions (for real-time updates)
  type Subscription {
    companyStatusChanged: Company!
    newCompanyRegistered: Company!
  }
`;
