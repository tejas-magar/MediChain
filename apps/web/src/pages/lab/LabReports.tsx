import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { mockService } from '../../services/mockService';
import { Badge, Button, Card, CardHeader, CardTitle, CardContent, Input, Select, EmptyState } from '../../components/ui';
import { MedicalDocument } from '../../types';
import { AmendDocumentModal } from '../../components/modals/AmendDocumentModal';

export const LabReports: React.FC = () => {
  const { activeLab } = useRole();
  const [docs, setDocs] = useState(() => mockService.getDocumentsByIssuer(activeLab.id, activeLab.licenseNumber));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FINALIZED' | 'SUPERSEDED'>('ALL');
  const [amendTargetDoc, setAmendTargetDoc] = useState<MedicalDocument | null>(null);

  useEffect(() => {
    setDocs(mockService.getDocumentsByIssuer(activeLab.id, activeLab.licenseNumber));
  }, [activeLab.id, activeLab.licenseNumber]);

  const refreshDocs = () => {
    setDocs(mockService.getDocumentsByIssuer(activeLab.id, activeLab.licenseNumber));
  };

  const filteredDocs = docs.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.patientName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            My Issued Laboratory Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Diagnostic pathology panels authored and digitally certified by {activeLab.fullName} ({activeLab.licenseNumber}).
          </p>
        </div>

        <Link to="/lab/reports/new">
          <Button variant="primary" size="sm">
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Create New Lab Report
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Search by report title, LAB #, or patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              options={[
                { value: 'ALL', label: 'All Statuses (Active & Superseded)' },
                { value: 'FINALIZED', label: 'Active Finalized Reports' },
                { value: 'SUPERSEDED', label: 'Superseded (Previous Versions)' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lab Reports Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Laboratory Registry Reports ({filteredDocs.length})</CardTitle>
            <span className="text-xs text-slate-400">
              Facility: {activeLab.organization}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocs.length === 0 ? (
            <EmptyState
              title="No Laboratory Reports Found"
              description="No issued laboratory reports matched your search criteria."
              action={
                <Link to="/lab/reports/new">
                  <Button variant="primary" size="sm">
                    Create Lab Report Now
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">LAB Identifier</th>
                    <th className="py-3 px-3">Patient</th>
                    <th className="py-3 px-3">Diagnostic Classification</th>
                    <th className="py-3 px-3">Version</th>
                    <th className="py-3 px-3">Issued Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-slate-900">
                        {doc.documentNumber}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {doc.patientName}
                        <div className="text-[11px] font-mono text-slate-400 font-normal">
                          {doc.patientMrn}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        <Link to={`/documents/${doc.id}`} className="hover:text-teal-700">
                          {doc.title}
                        </Link>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        v{doc.version}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
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
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          {doc.status === 'FINALIZED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAmendTargetDoc(doc)}
                              className="text-xs"
                              title="Issue Controlled Amendment"
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-1 text-teal-600" />
                              Amend
                            </Button>
                          )}
                          <Link to={`/verify/${doc.verificationToken}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              title="Verify Record"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                          </Link>
                          <Link to={`/documents/${doc.id}`}>
                            <Button variant="primary" size="sm" className="text-xs">
                              Inspect
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amendment Modal */}
      {amendTargetDoc && (
        <AmendDocumentModal
          isOpen={!!amendTargetDoc}
          onClose={() => setAmendTargetDoc(null)}
          document={amendTargetDoc}
          authorName={activeLab.fullName}
          onSuccess={() => {
            refreshDocs();
            setAmendTargetDoc(null);
          }}
        />
      )}
    </div>
  );
};
