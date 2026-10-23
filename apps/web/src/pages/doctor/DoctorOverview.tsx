import React from 'react';
import { Link } from 'react-router-dom';
import {
  Pill,
  PlusCircle,
  Search,
  FileSignature,
  ArrowRight,
  Clock,
  Stethoscope,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { mockService } from '../../services/mockService';
import { Badge, Button, Card, CardHeader, CardTitle, CardContent } from '../../components/ui';

export const DoctorOverview: React.FC = () => {
  const { activeDoctor } = useRole();
  const issuedDocs = mockService.getDocumentsByIssuer(activeDoctor.id, activeDoctor.licenseNumber);
  const activePrescriptions = issuedDocs.filter((d) => d.status === 'FINALIZED');
  const supersededDocs = issuedDocs.filter((d) => d.status === 'SUPERSEDED');

  return (
    <div className="space-y-6">
      {/* Doctor Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-teal-800 text-teal-100 font-bold flex items-center justify-center text-lg shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {activeDoctor.fullName}
              </h1>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200">
                {activeDoctor.licenseNumber}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              <span>{activeDoctor.specialty}</span>
              <span>•</span>
              <span>{activeDoctor.organization}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link to="/doctor/patients">
            <Button variant="outline" size="sm">
              <Search className="w-4 h-4 mr-1.5" />
              Find Patient
            </Button>
          </Link>
          <Link to="/doctor/prescriptions/new">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Create Prescription
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Active Prescriptions
                </span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {activePrescriptions.length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <FileSignature className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              Digitally signed and sealed
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Amended / Superseded
                </span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {supersededDocs.length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              Controlled versioning trail
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Issued Records
                </span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {issuedDocs.length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <Pill className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              Across all assigned patients
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issued Prescriptions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Issued Prescriptions</CardTitle>
            <Link
              to="/doctor/prescriptions"
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center"
            >
              View All Prescriptions <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">RX Number</th>
                  <th className="py-3 px-3">Patient Name</th>
                  <th className="py-3 px-3">Clinical Indication / Title</th>
                  <th className="py-3 px-3">Version</th>
                  <th className="py-3 px-3">Issued Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {issuedDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-slate-900">
                      {doc.documentNumber}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {doc.patientName} ({doc.patientMrn})
                    </td>
                    <td className="py-3 px-3 text-slate-700">{doc.title}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">v{doc.version}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(doc.issuedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          doc.status === 'FINALIZED'
                            ? 'success'
                            : doc.status === 'SUPERSEDED'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link to={`/documents/${doc.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          Inspect
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
