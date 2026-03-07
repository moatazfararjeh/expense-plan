import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function ExpenseChart({ monthlyExpenses, transactions, salary, currency = 'SAR', planStartDate }) {
  const startDate = planStartDate ? new Date(planStartDate) : new Date();
  
  // Helper function to check if expense is active in a given month/year
  const isExpenseActiveInMonth = (expense, month, year) => {
    const startMonth = expense.start_month || 1;
    const endMonth = expense.end_month || 12;
    const startYear = expense.start_year || new Date().getFullYear();
    const endYear = expense.end_year || new Date().getFullYear();
    
    // Create date objects for comparison
    const checkDate = new Date(year, month - 1, 1);
    const expenseStartDate = new Date(startYear, startMonth - 1, 1);
    const expenseEndDate = new Date(endYear, endMonth - 1, 1);
    
    return checkDate >= expenseStartDate && checkDate <= expenseEndDate;
  };
  
  // Calculate total expenses for each expense across the 12-month plan
  const expenseData = monthlyExpenses.map(exp => {
    let totalAmount = 0;
    for (let i = 0; i < 12; i++) {
      const actualDate = new Date(startDate);
      actualDate.setMonth(actualDate.getMonth() + i);
      const actualMonth = actualDate.getMonth() + 1;
      const actualYear = actualDate.getFullYear();
      
      if (isExpenseActiveInMonth(exp, actualMonth, actualYear)) {
        totalAmount += parseFloat(exp.amount);
      }
    }
    
    return {
      name: exp.name,
      value: totalAmount
    };
  }).filter(item => item.value > 0); // Only show expenses that have value in the plan period

  // Prepare data for category breakdown across the 12-month plan
  const categoryData = {};
  
  // Add recurring expenses
  for (let i = 0; i < 12; i++) {
    const actualDate = new Date(startDate);
    actualDate.setMonth(actualDate.getMonth() + i);
    const actualMonth = actualDate.getMonth() + 1;
    const actualYear = actualDate.getFullYear();
    
    monthlyExpenses.forEach(exp => {
      if (isExpenseActiveInMonth(exp, actualMonth, actualYear)) {
        const category = exp.category || 'Other';
        categoryData[category] = (categoryData[category] || 0) + parseFloat(exp.amount);
      }
    });
  }
  
  // Add daily transactions
  transactions.forEach(trans => {
    const category = trans.category || 'Other';
    categoryData[category] = (categoryData[category] || 0) + parseFloat(trans.amount);
  });

  const categoryChartData = Object.keys(categoryData).map(key => ({
    name: key,
    amount: categoryData[key]
  }));

  // Calculate accurate yearly totals based on the 12-month plan
  let totalRecurringExpenses = 0;
  for (let i = 0; i < 12; i++) {
    const actualDate = new Date(startDate);
    actualDate.setMonth(actualDate.getMonth() + i);
    const actualMonth = actualDate.getMonth() + 1;
    const actualYear = actualDate.getFullYear();
    
    monthlyExpenses.forEach(exp => {
      if (isExpenseActiveInMonth(exp, actualMonth, actualYear)) {
        totalRecurringExpenses += parseFloat(exp.amount);
      }
    });
  }
  
  const totalTransactions = transactions.reduce((sum, trans) => sum + parseFloat(trans.amount), 0);
  
  const yearlyData = [
    { name: 'Income', amount: salary * 12 },
    { name: 'Recurring Expenses', amount: totalRecurringExpenses },
    { name: 'Daily Transactions', amount: totalTransactions },
    { name: 'Savings', amount: Math.max(0, (salary * 12) - totalRecurringExpenses - totalTransactions) }
  ];

  const COLORS = ['#0f4c81', '#12a7d4', '#f5b301', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#7e8a97'];

  return (
    <div className="chart-container">
      <h2>📈 Expense Visualization</h2>
      
      {monthlyExpenses.length > 0 && (
        <>
          <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#555' }}>Monthly Recurring Expenses Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value.toLocaleString()} ${currency}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {expenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </>
      )}

      {categoryChartData.length > 0 && (
        <>
          <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#555' }}>Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toLocaleString()} ${currency}`} />
              <Legend />
              <Bar dataKey="amount" fill="#0f4c81" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {salary > 0 && (
        <>
          <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#555' }}>Yearly Financial Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toLocaleString()} ${currency}`} />
              <Legend />
              <Bar dataKey="amount" fill="#764ba2" />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}

export default ExpenseChart;
