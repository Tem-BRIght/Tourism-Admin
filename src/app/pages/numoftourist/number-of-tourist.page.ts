import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';

interface MonthlyData {
  month: string;
  tourists: number;
  tours: number;
  growth: number;
}

interface DestinationStat {
  name: string;
  tourists: number;
  tours: number;
  growth: string;
  trend: 'up' | 'down' | 'stable';
}

@Component({
  selector: 'app-number-of-tourist',
  templateUrl: './number-of-tourist.page.html',
  styleUrls: ['./number-of-tourist.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule]
})
export class NumberOfTouristPage implements OnInit {
  // Permission flags
  canViewAnalytics: boolean = false;
  
  // UI states
  isLoading: boolean = false;
  selectedPeriod: string = 'weekly';
  selectedYear: number = 2024;
  chartType: 'bar' | 'line' = 'bar';
  showExportOptions: boolean = false;
  
  // Statistics - Removed active tours, kept only relevant stats
  totalTouristsToday: number = 1284;
  totalTouristsChange: number = 12.5;
  monthlyGrowth: number = 18.4;
  monthlyGrowthChange: number = 5.2;
  mostPopular: string = 'Rainforest Park';
  mostPopularCount: number = 3240;
  
  // Chart data
  monthlyData: MonthlyData[] = [
    { month: 'Jan', tourists: 1250, tours: 45, growth: 8.2 },
    { month: 'Feb', tourists: 1450, tours: 52, growth: 10.5 },
    { month: 'Mar', tourists: 1850, tours: 68, growth: 12.8 },
    { month: 'Apr', tourists: 2100, tours: 75, growth: 15.2 },
    { month: 'May', tourists: 2450, tours: 82, growth: 18.4 },
    { month: 'Jun', tourists: 2800, tours: 95, growth: 20.1 }
  ];

  topDestinations: DestinationStat[] = [
    { name: 'Rainforest Park', tourists: 3240, tours: 98, growth: '+15%', trend: 'up' },
    { name: 'Pasig Museum', tourists: 2870, tours: 87, growth: '+12%', trend: 'up' },
    { name: 'Capitol Commons', tourists: 2560, tours: 76, growth: '+8%', trend: 'up' },
    { name: 'Pasig Cathedral', tourists: 1980, tours: 65, growth: '-2%', trend: 'down' },
    { name: 'Ace Water Spa', tourists: 1650, tours: 54, growth: '+10%', trend: 'up' },
    { name: 'Bagong Ilog Park', tourists: 890, tours: 32, growth: '+5%', trend: 'stable' }
  ];

  // Quick stats - Removed peak hours, kept only relevant stats
  quickStats = [
    { label: 'Average Group Size', value: '4.2', icon: '👥' },
    { label: 'Average Tour Duration', value: '3.5h', icon: '⏱️' },
    { label: 'Return Rate', value: '68%', icon: '🔄' },
    { label: 'International Tourists', value: '45%', icon: '🌍' }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.canViewAnalytics = this.authService.hasAccess({ table: 'analytics_data', action: 'read' });
    this.loadData();
  }

  // ============= DATA LOADING FUNCTIONS =============
  loadData() {
    if (!this.canViewAnalytics) return;
    
    this.isLoading = true;
    setTimeout(() => {
      this.fetchMonthlyData();
      this.fetchTopDestinations();
      this.fetchQuickStats();
      this.isLoading = false;
    }, 500);
  }

  fetchMonthlyData() {
    console.log('Fetching monthly data...');
  }

  fetchTopDestinations() {
    console.log('Fetching top destinations...');
  }

  fetchQuickStats() {
    console.log('Fetching quick stats...');
  }

  // ============= PERIOD FILTER FUNCTIONS =============
  changePeriod(period: string) {
    this.selectedPeriod = period;
    this.loadData();
  }

  changeYear(year: number) {
    this.selectedYear = year;
    this.loadData();
  }

  // ============= CHART FUNCTIONS =============
  toggleChartType() {
    this.chartType = this.chartType === 'bar' ? 'line' : 'bar';
  }

  getMaxTourists(): number {
    return Math.max(...this.monthlyData.map(d => d.tourists));
  }

  getMaxTours(): number {
    return Math.max(...this.monthlyData.map(d => d.tours));
  }

  // ============= EXPORT FUNCTIONS =============
  toggleExportOptions() {
    this.showExportOptions = !this.showExportOptions;
  }

  exportData(format: 'pdf' | 'excel' | 'csv') {
    if (!this.canViewAnalytics) return;
    
    console.log(`Exporting data as ${format}...`);
    
    switch(format) {
      case 'csv':
        this.exportAsCSV();
        break;
      case 'excel':
        this.exportAsExcel();
        break;
      case 'pdf':
        this.exportAsPDF();
        break;
    }
    
    this.showExportOptions = false;
  }

  exportAsCSV() {
    const monthlyHeaders = ['Month', 'Tourists', 'Tours', 'Growth %'];
    const monthlyCSV = this.monthlyData.map(m => 
      [m.month, m.tourists, m.tours, m.growth].join(',')
    );
    monthlyCSV.unshift(monthlyHeaders.join(','));
    
    const destHeaders = ['Destination', 'Tourists', 'Tours', 'Growth'];
    const destCSV = this.topDestinations.map(d => 
      [d.name, d.tourists, d.tours, d.growth].join(',')
    );
    destCSV.unshift(destHeaders.join(','));
    
    const fullCSV = 'MONTHLY DATA\n' + monthlyCSV.join('\n') + '\n\nTOP DESTINATIONS\n' + destCSV.join('\n');
    
    const blob = new Blob([fullCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${this.selectedPeriod}_${this.selectedYear}.csv`;
    a.click();
  }

  exportAsExcel() {
    console.log('Exporting as Excel...');
    alert('Excel export would be implemented here');
  }

  exportAsPDF() {
    console.log('Exporting as PDF...');
    alert('PDF export would be implemented here');
  }

  // ============= TREND ANALYSIS FUNCTIONS =============
  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  getOverallGrowth(): number {
    if (this.monthlyData.length < 2) return 0;
    const first = this.monthlyData[0].tourists;
    const last = this.monthlyData[this.monthlyData.length - 1].tourists;
    return this.calculateGrowthRate(last, first);
  }

  getBusiestMonth(): string {
    if (this.monthlyData.length === 0) return '';
    const busiest = this.monthlyData.reduce((max, curr) => 
      curr.tourists > max.tourists ? curr : max
    );
    return busiest.month;
  }

  // ============= FORECAST FUNCTIONS =============
  forecastNextMonth(): number {
    if (this.monthlyData.length < 3) return 0;
    
    const last3 = this.monthlyData.slice(-3).map(d => d.tourists);
    const avg = last3.reduce((a, b) => a + b, 0) / 3;
    const growth = this.monthlyData[this.monthlyData.length - 1].growth / 100;
    
    return Math.round(avg * (1 + growth));
  }

  // ============= COMPARISON FUNCTIONS =============
  compareWithPreviousPeriod(): { tourists: number, tours: number } {
    if (this.monthlyData.length < 2) {
      return { tourists: 0, tours: 0 };
    }
    
    const current = this.monthlyData[this.monthlyData.length - 1];
    const previous = this.monthlyData[this.monthlyData.length - 2];
    
    return {
      tourists: this.calculateGrowthRate(current.tourists, previous.tourists),
      tours: this.calculateGrowthRate(current.tours, previous.tours)
    };
  }

  // ============= NAVIGATION FUNCTIONS =============
  navigateTo(page: string) {
  const routes: { [key: string]: string } = {
    dashboard:           '/dashboard',
    bookings:            '/tourguide',
    feedback:            '/feedback-ratings',
    monitoring:          '/monitoring',
    'number-of-tourist': '/number-of-tourist',
    destinations:        '/destinations',
    'tour-guides':       '/tour-guides',
    users:               '/users',
  };
  if (!routes[page]) {
    console.warn(`navigateTo: unknown page "${page}"`);
    return;
  }
  this.router.navigate([routes[page]]);
}

  // ============= LOGOUT FUNCTION =============
  logout() {
    this.authService.logout();
  }
}